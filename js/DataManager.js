import { Renderer } from "./Renderer.js";
import UIController from "./UIController.js";

export default class DataManager extends UIController
{
  static dontSerialize = UIController.dontSerialize.concat(["listClasses","elements","stickyElements","errors","storeTimeout"]);
  
  dataVersion = 1;
  currentView;
  settings = {};
  listClasses = {};
  data = {};
  elements = {};
  stickyElements = [];
  errors;
  storeTimeout;
  
  constructor()
  {
    super();
    this.elements['content'] = document.getElementById("content");
    this.elements['popup'] = document.getElementById("popup");
    this.elements['popup'].addEventListener('hidden.bs.modal', event => UIController.clearDependencies(event.target, true));
    this.settings.paneMemory = {};
    this.settings.preferences = {};
    this.settings.server = null;
  }
  
  get lists()
  {
    return data;
  }
  
  get controllers()
  {
    return Renderer.controllers;
  }
  
  paneFromHash()
  {
    return null;
  }
  
  async view(pane)
  {
    if(!pane)
    {
      if(Object.keys(this.listClasses).length)
      {
        pane = this.paneFromHash();
        console.log(`No pane given in ${this.constructor.name}.view(1), using "${pane}".`);
      }
      else
        throw new Error(`${this.constructor.name} has no list classes defined.`);
    }
    if(!this.lists[pane])
      throw new Error(`${this.constructor.name} has no list "${pane}".`);
    
    await this.lists[pane].render();
    this.stickyElements = document.querySelectorAll(".sticky-js");
    window.scrollTo({left:0, top:this.settings.paneMemory[pane]?.scrollY ?? 0, behavior:"instant"});
    for(let l in this.lists)
    {
      if(l == pane)
        this.elements[l].classList.add("current-view");
      else
        this.elements[l].classList.remove("current-view");
    }
    this.currentView = pane;
  }
  
  onScroll(event)
  {
    for(let element of this.stickyElements)
    {
      element.style.top = window.scrollY+"px";
    }
  }
  
  saveScrollX(px)
  {
    if(this.settings.paneMemory[this.currentView])
      this.settings.paneMemory[this.currentView].scrollX = px;
    //console.log(this.settings.paneMemory[this.currentView].scrollX, this.settings.paneMemory[this.currentView].scrollY);
  }
  
  saveScrollY(px)
  {
    if(this.settings.paneMemory[this.currentView])
      this.settings.paneMemory[this.currentView].scrollY = px;
    //console.log(this.settings.paneMemory[this.currentView].scrollX, this.settings.paneMemory[this.currentView].scrollY);
  }
  
  load(data, options={})
  {
    // Check for valid JSON.
    if(typeof(data) != "object")
    {
      try
      {
        data = JSON.parse(data);
        console.log(`Loaded JSON data:`, data);
      }
      catch
      {
        this.elements.loadError.classList.remove("d-none");
        this.elements.loadError.innerHTML = "Your input did not contain valid JSON.";
        this.errors = true;
        return false;
      }
    }
    return this.postLoad(data, options);
  }
  
  postLoad(data, options)
  {
    this.queueStore();
    bootstrap.Modal.getOrCreateInstance(this.elements.loadModal).hide();
    this.elements.loadError.classList.add("d-none");
    this.view(this.currentView);
    return true;
  }
  
  settingsFromJSON(json)
  {
    try
    {
      let settings = JSON.parse(json);
      if(settings)
      {
        for(let s in this.settings)
          if(s in settings)
            this.settings[s] = settings[s];
        for(let s in settings)
          this.settings[s] = settings[s];
        console.log("Loaded settings from local storage.", this.settings);
      }
      else
      {
        console.log("No settings to load.");
      }
    }
    catch(x)
    {
      console.error("Could not load stored settings.", x);
      this.errors = true;
    }
  }
  
  queueStore()
  {
    if(this.storeTimeout)
      clearTimeout(this.storeTimeout);
    this.storeTimeout = setTimeout(() => {
      this.store();
    }, 200);
  }
  
  store()
  {
    if(this.errors)
    {
      console.warn(`Prevented saving of local data due to errors being detected during load, in order to prevent saved data corruption. You must reload the page to clear this. If the problem persist, you may have to report a bug to the developer here: https://github.com/kree-nickm/genshin-manager/issues`);
      return false;
    }
    
    this.settings.server = this.settings.server ?? Object.keys(this.data ?? {})[0] ?? "";
    if(!this.data)
      this.data = {};
    this.data[this.settings.server] = this.lists;
    window.localStorage.setItem(`${this.constructor.name}Data`, JSON.stringify(this.data));
    window.localStorage.setItem(`${this.constructor.name}Settings`, JSON.stringify(this.settings));
    console.log(`Local data saved.`);
  }
  
  retrieve()
  {
    let data;
    try
    {
      data = JSON.parse(window.localStorage.getItem(`${this.constructor.name}Data`) ?? "null");
      if(data)
      {
        for(let srv in data)
        {
          if(!this.data[srv])
            this.data[srv] = {};
          this.settings.server = srv;
          for(let list in data[srv])
          {
            this.data[srv][this.listClasses[data[srv][list].__class__].name] = this.listClasses[data[srv][list].__class__].fromJSON(data[srv][list], {viewer:this});
          }
        }
        console.log("Loaded account data from local storage.", data);
      }
      else
      {
        console.log("No account data to load.");
      }
    }
    catch(x)
    {
      console.error("Could not load stored local account data.", x);
      this.errors = true;
    }
    
    // Load site-specific preferences.
    this.settingsFromJSON(window.localStorage.getItem(`${this.constructor.name}Settings`));
    this.settings.server = this.settings.server ?? Object.keys(this.data ?? {})[0] ?? "";
    
    this.activateAccount(this.settings.server)
    
    if(this.currentView)
      this.view(this.currentView);
  }
}