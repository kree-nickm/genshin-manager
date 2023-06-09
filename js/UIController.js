import { handlebars, Renderer } from "./Renderer.js";

handlebars.registerHelper("getProperty", (item, property, context) => item.getProperty(property));
handlebars.registerHelper("uuid", (item, context) => item.uuid);
handlebars.registerHelper('toParam', (item, context) => item instanceof UIController ? item.uuid : String.valueOf(item));

export default class UIController {
  static dontSerialize = ["uuid","dependents"];
  
  static fromJSON(data, {addProperties={}}={})
  {
    let obj = new this();
    for(let prop in addProperties)
      obj[prop] = addProperties[prop];
    for(let prop in obj)
      if(this.dontSerialize.indexOf(prop) == -1 && data[prop] !== undefined)
        obj.update(prop, data[prop], "replace");
    return obj;
  }
  
  uuid;
  dependents = {}; // Note: In the future, properties of this object could be changed to Sets instead of Arrays.
  
  constructor()
  {
    this.uuid = crypto.randomUUID();
    Renderer.controllers.set(this.uuid, this);
  }
  
  parseProperty(path, {create=true}={})
  {
    if(!Array.isArray(path))
      path = path.split(".");
    let string = path.map(item => Array.isArray(item) ? (item[0] +":"+ item.slice(1).join(",")) : item).join(".");
    let obj = this;
    for(let i=0; i<path.length-1; i++)
    {
      if(Array.isArray(path[i]))
      {
        let func = path[i].shift();
        if(typeof(obj[func]) == "function")
        {
          obj = obj[func](...path[i]);
          if(!obj)
            break;
        }
        else
        {
          console.error(`Array given in path expression "${string}" in [${this.constructor.name} object].parseProperty, but [${obj.constructor.name} object].${func} is not a function. Arrays must correspond to functions and their arguments.`);
          return {string, path};
        }
      }
      else if(obj[path[i]] == undefined)
      {
        if(create)
          obj[path[i]] = {};
        else
        {
          obj = undefined;
          break;
        }
      }
      else if(typeof(obj[path[i]]) != "object")
      {
        console.error(`[${this.constructor.name} object].${string} encountered a non-object at '${path[i]}'.`);
        return {string, path};
      }
      obj = obj[path[i]];
      if(!obj)
        break;
    }
    return {string, path, object:obj, property:path[path.length-1], value:obj?.[path[path.length-1]]};
  }
  
  getProperty(prop, {create=true}={})
  {
    return this.parseProperty(prop, false).value;
  }
  
  update(field, value, action, options={})
  {
    field = this.parseProperty(field, {create: action!="notify"});
    value = this.beforeUpdate(field, value, action, options);
    let needsUpdate = false;
    if(action == "notify")
    {
      if(typeof(value) == "object")
        for(let prop in value)
          options[prop] = value[prop];
      value = field.value;
      // Note: I'm not sure if "notify" always needs to trigger a viewer.store
      needsUpdate = true;
    }
    else if(typeof(field.value) == "object" || typeof(field.value) == "function")
    {
      if(!action)
        console.warn(`${this.constructor.name}.update() expects a third argument when the property being updated (${field.string}) is non-scalar (it's a ${typeof(field.value)}).`);
      else
      {
        if(Array.isArray(field.value))
        {
          if(action == "replace")
          {
            field.object[field.property] = value;
            for(let prev of field.value)
            {
              if(prev instanceof UIController)
                prev.notifyAll();
            }
            needsUpdate = true;
          }
          else if(action == "push")
          {
            field.object[field.property].push(value);
            needsUpdate = true;
          }
          else if(action == "remove")
          {
            let index;
            while((index = field.value.indexOf(value)) > -1)
              field.value.splice(index, 1);
            if(value instanceof UIController)
              value.notifyAll();
            needsUpdate = true;
          }
          else
            console.warn(`Unknown action '${action}' in ${this.constructor.name}.update() when updating array '${field.string}'.`);
        }
        else if(typeof(field.value) == "object")
        {
          if(action == "replace")
          {
            field.object[field.property] = value;
            needsUpdate = true;
          }
          else if(action == "delete")
          {
            delete field.object[field.property];
            needsUpdate = true;
          }
          else
            console.warn(`Unknown action '${action}' in ${this.constructor.name}.update() when updating object '${field.string}'.`);
        }
        else if(typeof(field.value) == "function")
        {
          console.warn(`Unknown action '${action}' in ${this.constructor.name}.update() when updating function '${field.string}'.`);
        }
      }
    }
    else
    {
      if(field.value !== value)
      {
        field.object[field.property] = value;
        needsUpdate = true;
      }
    }
    
    if(needsUpdate)
    {
      window.viewer.queueStore();
      for(let dep of this.dependents[field.string] ?? [])
        if(dep)
          Renderer.queueUpdate(dep);
      for(let dep of this.dependents['.'] ?? [])
        if(dep)
          Renderer.queueUpdate(dep);
    }
    this.afterUpdate(field, value, action, options);
    return this;
  }
  
  beforeUpdate(field, value, action, options)
  {
    // Code to validate the value before updating.
    return value;
  }
  
  afterUpdate(field, value, action, options)
  {
    // Any code to run after a value is changed.
  }
  
  notifyAll()
  {
    for(let field in this.dependents)
      for(let dep of this.dependents[field] ?? [])
        if(dep)
          Renderer.queueUpdate(dep);
  }
  
  cleanupDependents()
  {
    for(let field in this.dependents)
      this.dependents[field] = this.dependents[field].filter(element => element && element.isConnected);
  }
  
  addDependent(prop, dep)
  {
    if(prop != ".")
    {
      prop = this.parseProperty(prop);
      if(!this.dependents[prop.string])
        this.dependents[prop.string] = [];
      this.dependents[prop.string].push(dep);
    }
    else
    {
      if(!this.dependents[prop])
        this.dependents[prop] = [];
      this.dependents[prop].push(dep);
    }
    return this;
  }
  
  removeDependent(prop, dep)
  {
    if(prop != ".")
    {
      prop = this.parseProperty(prop);
      if(this.dependents[prop.string])
        this.dependents[prop.string] = this.dependents[prop.string].filter(element => element != dep);
    }
    else
    {
      if(this.dependents[prop])
        this.dependents[prop] = this.dependents[prop].filter(element => element != dep);
    }
    return this;
  }
  
  onRender(element)
  {
  }
  
  unlink({skipHTML}={})
  {
    Renderer.controllers.delete(this.uuid);
    if(!skipHTML)
      Renderer.removeItem(this);
  }
  
  toJSON()
  {
    let result = {__class__: this.constructor.name};
    for(let key of Object.keys(this))
      if(["object","string","boolean","number","bigint"].indexOf(typeof(this[key])) > -1 && this.constructor.dontSerialize.indexOf(key) == -1)
        result[key] = this[key];
    return result;
  }
}
