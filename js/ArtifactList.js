import GenshinArtifactData from "./gamedata/GenshinArtifactData.js";

import { handlebars, Renderer } from "./Renderer.js";
import GenshinList from "./GenshinList.js";
import Artifact from "./Artifact.js";

handlebars.registerHelper('iffave', function(character, setKey, build, options) {
  if(!options)
  {
    options = build;
    build = undefined;
  }
  if(character.getArtifactSetPrio(setKey, build))
    return options.fn(this);
  else
    return options.inverse(this);
});

handlebars.registerHelper("artifactStat", (key, character, context) => {
  if(key == "elemental_dmg_" && character instanceof Character)
    return Artifact.shorthandStat[character.element.toLowerCase()+'_dmg_'];
  else
    return Artifact.shorthandStat[key];
});

handlebars.registerHelper("artifactRating", (artifact, statKey, character, context) => {
  if(context)
  {
    let scores = artifact.getCharacterScoreParts(character);
    return scores.subScores[statKey]?.toFixed(2) ?? "0.00";
  }
  else if(statKey instanceof Character)
    return artifact.getCharacterScore(statKey).toFixed(2);
  else
    return artifact.getSubstatRating(statKey).sum.toFixed(2);
});

export default class ArtifactList extends GenshinList
{
  static dontSerialize = GenshinList.dontSerialize.concat(["elements"]);
  static itemClass = Artifact;
  static subsetDefinitions = {
    'flower': item => item.slotKey == "flower",
    'plume': item => item.slotKey == "plume",
    'sands': item => item.slotKey == "sands",
    'goblet': item => item.slotKey == "goblet",
    'circlet': item => item.slotKey == "circlet",
  };
  
  elements = {};
  
  async evaluate()
  {
    //console.log(`Evaluating all artifacts...`);
    this.list.forEach(artifact => artifact.update("wanters", [], "replace"));
    // Cycle through every character so we can access their artifact priority lists.
    this.viewer.lists.CharacterList.list.forEach(character => {
      if(!character.consider)
        return true;
      // Cycle through all their builds.
      for(let buildId in character.getBuilds())
      {
        let related = character.getRelatedItems(buildId, {ignoreTargets:true});
        // Handle each slot separately.
        for(let slot of ["flower","plume","sands","goblet","circlet"])
        {
          // Mark the best artifacts we have.
          let numToKeep = 1;
          for(let i=0; i<numToKeep; i++)
          {
            if(related.bestArtifacts[slot][i])
            {
              related.bestArtifacts[slot][i].update("wanters", `#${i+1} ${slot} for ${character.name} (${buildId})`, "push");
              // Don't bother with anything worse than what they are already using.
              if(related.bestArtifacts[slot][i].character == character)
              {
                numToKeep = i;
              }
              // If this artifact is taken, check for 1 more in total.
              else if(related.bestArtifacts[slot][i].character)
              {
                numToKeep++;
              }
            }
          }
          for(let setKey in related.buildData.artifactSets)
          {
            // Mark the best artifacts we have for each desired set.
            numToKeep = 1;
            let bestOfSet = related.bestArtifacts[slot].filter(artifact => artifact.setKey == setKey);
            for(let i=0; i<numToKeep; i++)
            {
              if(bestOfSet[i])
              {
                bestOfSet[i].update("wanters", `#${i+1} ${setKey} ${slot} for ${character.name} (${buildId})`, "push");
                // Don't bother with anything worse than what they are already using.
                if(bestOfSet[i].character == character)
                {
                  numToKeep = i;
                }
                // If this artifact is taken, check for 1 more in total.
                else if(bestOfSet[i].character)
                {
                  numToKeep++;
                }
              }
            }
          }
        }
      }
    });
    //console.log(`...Done.`);
    document.querySelector("#artifactEvaluateBtn")?.classList.remove("show-notice");
  }
  
  afterUpdate(field, value, action, options)
  {
    super.afterUpdate(field, value, action, options);
    if(field.string == "list" && value.length != field.value.length || field.string == "evaluate")
      document.querySelector("#artifactEvaluateBtn")?.classList.add("show-notice");
  }
  
  setupDisplay()
  {
    let idField = this.display.addField("id", {
      label: "I",
      labelTitle: "Sort in the same order as the in-game inventory when you select 'quality'.",
      sort: {func: (o,a,b) => {
        let slotSortR = ["circlet","goblet","sands","plume","flower"];
        let A = a.rarity*52500 + a.level*2500 + Object.keys(GenshinArtifactData).indexOf(a.setKey)*25 + slotSortR.indexOf(a.slotKey)*5 + a.substats.length - a.id/2000;
        let B = b.rarity*52500 + b.level*2500 + Object.keys(GenshinArtifactData).indexOf(b.setKey)*25 + slotSortR.indexOf(b.slotKey)*5 + b.substats.length - b.id/2000;
        if(isNaN(A) && !isNaN(B))
          return 1;
        else if(!isNaN(A) && isNaN(B))
          return -1;
        else if(isNaN(A) && isNaN(B))
          return 0;
        else
          return o*(B-A);
      }},
      dynamic: true,
      value: item => item.id,
    });
    
    let setField = this.display.addField("set", {
      label: "Set",
      sort: {generic: {type:"string",property:"setName"}},
      dynamic: false,
      value: item => item.setName,
      classes: item => ({
        "material": true,
        "q1": item.rarity == 1,
        "q2": item.rarity == 2,
        "q3": item.rarity == 3,
        "q4": item.rarity == 4,
        "q5": item.rarity == 5,
      }),
    });
    
    let slotField = this.display.addField("slot", {
      label: "Slot",
      sort: {func: (o,a,b) => {
        let slotSortR = ["circlet","goblet","sands","plume","flower"];
        let A = slotSortR.indexOf(a.slotKey);
        let B = slotSortR.indexOf(b.slotKey);
        if(isNaN(A) && !isNaN(B))
          return 1;
        else if(!isNaN(A) && isNaN(B))
          return -1;
        else if(isNaN(A) && isNaN(B))
          return 0;
        else
          return o*(B-A);
      }},
      dynamic: false,
      value: item => item.slotKey,
    });
    
    let levelField = this.display.addField("level", {
      label: "Lvl",
      sort: {generic: {type:"number",property:"level"}},
      dynamic: true,
      value: item => "+"+item.level,
      edit: item => ({target: {item:item , field:"level"}}),
    });
    
    let lockField = this.display.addField("lock", {
      label: "L",
      sort: {generic: {type:"boolean",property:"lock"}},
      dynamic: true,
      title: item => "Is Locked?",
      classes: item => ({
        "insufficient": !item.wanters.length,
      }),
      edit: item => ({
        target: {item:item, field:"lock"},
        type: "checkbox",
        value: item.lock,
        trueClasses: ["fa-solid","fa-lock"],
        falseClasses: [],
      }),
      dependencies: item => [
        {item:item, field:"wanters"},
      ],
    });
    
    let mainStatField = this.display.addField("mainStat", {
      label: "Main",
      sort: {generic: {type:"string",property:"mainStatKey"}},
      dynamic: false,
      value: item => Artifact.shorthandStat[item.mainStatKey] ?? item.mainStatKey,
    });
    
    let substatValueGroup = {label:"Substat Values"};
    for(let statId of Artifact.substats)
    {
      let substatSumField = this.display.addField(statId+"Sum", {
        group: substatValueGroup,
        label: Artifact.shorthandStat[statId] ?? statId,
        sort: {func: (o,a,b) => o * (b.getSubstatSum(statId) - a.getSubstatSum(statId))},
        columnClasses: ['stat-'+statId],
        dynamic: true,
        value: item => { let result = item.getSubstatSum(statId); return result ? result : ""; },
        edit: item => ({
          func: item.setSubstat.bind(item, statId),
          type: "number",
          value: item.getSubstatSum(statId),
        }),
        dependencies: item => [
          {item:item, field:"substats"},
        ],
      });
    }
    
    let substatRatingGroup = {label:"Substat Ratings",title:"Weighs the current value of this substat against its maximum value, also factoring in the odds that it will increase if you continue to level up this artifact."};
    for(let statId of Artifact.substats)
    {
      let substatRatingFields = this.display.addField(statId+"Rating", {
        group: substatRatingGroup,
        label: Artifact.shorthandStat[statId] ?? statId,
        sort: {func: (o,a,b) => o * (b.getSubstatRating(statId).sum - a.getSubstatRating(statId).sum)},
        columnClasses: ['stat-rating-'+statId],
        dynamic: true,
        title: item => {
          let rating = item.getSubstatRating(statId);
          return `${rating.base.toFixed(2)} (base) + ${rating.chance.toFixed(2)} (chance)`;
        },
        value: item => item.getSubstatRating(statId).sum.toFixed(2),
        dependencies: item => [
          {item:item, field:"level"},
          {item:item, field:"substats"},
        ],
      });
    }
    
    let characterCountField = this.display.addField("characterCount", {
      label: "#",
      labelTitle: "The number of characters that might desire this artifact.",
      sort: {generic: {type:"number",property:"wanters.length"}},
      columnClasses: ['artifact-wanters'],
      dynamic: true,
      title: item => item.wanters.join("\r\n"),
      value: item => item.wanters.length,
      dependencies: item => [
        {item:item, field:"wanters"},
      ],
    });
    
    let locationField = this.display.addField("location", {
      label: "Equipped By",
      sort: {generic: {type:"string",property:"location"}},
      dynamic: true,
      value: item => [
        {
          value: item.character?.name ?? "",
          edit: {
            target: {item:item, field:"location"},
            type: "select",
            list: item.list.viewer.lists.CharacterList.items("equippable"),
            valueProperty: "key",
            displayProperty: "name",
          },
        },
        item.character ? {
          tag: "i",
          classes: {'fa-solid':true, 'fa-eye':true, 'float-end':true},
          popup: item.character,
        } : undefined,
      ],
      dependencies: item => [
        {item:item.list.viewer.lists.characters, field:"list"},
      ],
    });
    
    let deleteBtn = this.display.addField("deleteBtn", {
      label: "D",
      dynamic: true,
      dependencies: item => [
        {item:item, field:"lock"},
      ],
      title: item => (item.lock || item.location) ? "Unlock/unequip the artifact before deleting it." : "Delete this artifact from the list.",
      button: item => (item.lock || item.location) ? {icon: "fa-solid fa-trash-can"} : {
        icon: "fa-solid fa-trash-can",
        action: event => {
          event.stopPropagation();
          item.unlink();
          item.list.viewer.store();
        },
      },
    });
    
    let characterScoreField = this.display.addField("characterScore", {
      label: "Score",
      tags: ["detailsOnly"],
      dynamic: true,
      value: (artifact,character) => Math.round(artifact.getCharacterScore(character) * 100).toFixed(0) + "%",
      title: (artifact,character) => `How close this artifact is to ${character.name}'s best possible artifact for this build.`,
      dependencies: artifact => [
        {item:artifact, field:"level"},
        {item:artifact, field:"substats"},
      ],
    });
    
    let characterSubstatRatingField = this.display.addField("characterSubstatRating", {
      label: "Substat Rating",
      tags: ["detailsOnly"],
      dynamic: true,
      value: (artifact,character,substat) => {
        let scores = artifact.getCharacterScoreParts(character);
        return scores.subScores[substat]?.toFixed(2) ?? "0.00";
      },
      title: (artifact,character,substat) => `How much rating ${Artifact.shorthandStat[substat]} is contributing to this artifact's score for ${character.name}.`,
      dependencies: artifact => [
        {item:artifact, field:"level"},
        {item:artifact, field:"substats"},
      ],
    });
    
    let imageField = this.display.addField("image", {
      label: "Image",
      tags: ["detailsOnly"],
      dynamic: false,
      value: item => ({
        tag: "img",
        src: `https://rerollcdn.com/GENSHIN/Gear/${item.name.replaceAll(' ','_').toLowerCase()}.png`,
      }),
    });
    
    let substatField = this.display.addField("substat", {
      label: "Substat",
      tags: ["detailsOnly"],
      dynamic: true,
      value: (item,i) => Artifact.shorthandStat[item.substats[i]?.key] ?? "-",
      edit: (item,i) => item.substats[i] ? undefined : {
        func: statId => {
          item.setSubstat(statId, 0.1);
          let characterElement = item.viewer.elements.popup.querySelector(".list-item");
          let character = Renderer.controllers.get(characterElement.dataset.uuid);
          if(character)
          {
            let buildElement = characterElement.querySelector(".character-build");
            let buildId = buildElement.attributes.getNamedItem('name')?.value;
            let artifactElement = buildElement.querySelector(`.list-item[data-uuid="${item.uuid}"]`);
            Renderer.rerender(artifactElement, {item, buildId, character}, {renderedItem:character});
          }
        },
        type: "select",
        list: Artifact.substats.filter(statId => statId != item.mainStat && item.substats.map(s => s.key).indexOf(statId) == -1),
        displayProperty: statId => Artifact.shorthandStat[statId],
      },
      dependencies: artifact => [
        {item:artifact, field:"substats"},
      ],
    });
  }
  
  clear()
  {
    super.clear();
    this.viewer.lists.CharacterList.list.forEach(character => {
      character.flowerArtifact = null;
      character.plumeArtifact = null;
      character.sandsArtifact = null;
      character.gobletArtifact = null;
      character.circletArtifact = null;
    });
  }
  
  async render(force=false)
  {
    await super.render(force);
    
    let footer = document.getElementById("footer");
    footer.classList.remove("d-none");
    if(footer.dataset.list != this.uuid)
    {
      footer.replaceChildren();
      footer.dataset.list = this.uuid;
      
      let container = footer.appendChild(document.createElement("div"));
      container.classList.add("container-fluid", "navbar-expand");
      
      let ul = container.appendChild(document.createElement("ul"));
      ul.classList.add("navbar-nav");
      
      // Add Artifact
      let li1 = ul.appendChild(document.createElement("li"));
      li1.classList.add("nav-item", "me-2");
      
      let inputGroup = li1.appendChild(document.createElement("div"));
      inputGroup.classList.add("input-group");
      
      this.elements.selectSetAdd = inputGroup.appendChild(document.createElement("select"));
      this.elements.selectSetAdd.classList.add("form-select", "size-to-content");
      this.elements.selectSetAdd.title = "Artifact Set";
      this.elements.selectSetAdd.appendChild(document.createElement("option"))
      for(let itm in GenshinArtifactData)
      {
        let option = this.elements.selectSetAdd.appendChild(document.createElement("option"));
        option.value = itm;
        option.innerHTML = GenshinArtifactData[itm].name;
      }
      
      this.elements.selectRarityAdd = inputGroup.appendChild(document.createElement("select"));
      this.elements.selectRarityAdd.classList.add("form-select", "size-to-content");
      this.elements.selectRarityAdd.title = "Artifact Rarity";
      this.elements.selectRarityAdd.appendChild(document.createElement("option"))
      for(let itm of [5,4,3,2,1])
      {
        let option = this.elements.selectRarityAdd.appendChild(document.createElement("option"));
        option.value = itm;
        option.innerHTML = itm;
      }
      
      this.elements.selectSlotAdd = inputGroup.appendChild(document.createElement("select"));
      this.elements.selectSlotAdd.classList.add("form-select", "size-to-content");
      this.elements.selectSlotAdd.title = "Artifact Slot";
      this.elements.selectSlotAdd.appendChild(document.createElement("option"))
      for(let itm of ['flower','plume','sands','goblet','circlet'])
      {
        let option = this.elements.selectSlotAdd.appendChild(document.createElement("option"));
        option.value = itm;
        option.innerHTML = itm;
      }
      this.elements.selectSlotAdd.onchange = event => {
        switch(this.elements.selectSlotAdd.value)
        {
          case "flower":
            Array.from(this.elements.selectStatAdd.options).forEach(statOpt => statOpt.disabled = (statOpt.value != "hp"));
            this.elements.selectStatAdd.value = "hp";
            break;
          case "plume":
            Array.from(this.elements.selectStatAdd.options).forEach(statOpt => statOpt.disabled = (statOpt.value != "atk"));
            this.elements.selectStatAdd.value = "atk";
            break;
          case "sands":
            Array.from(this.elements.selectStatAdd.options).forEach(statOpt => statOpt.disabled = (["hp_","atk_","def_","eleMas","enerRech_"].indexOf(statOpt.value) == -1));
            this.elements.selectStatAdd.value = "";
            break;
          case "goblet":
            Array.from(this.elements.selectStatAdd.options).forEach(statOpt => statOpt.disabled = (["hp_","atk_","def_","eleMas"].indexOf(statOpt.value) == -1 && statOpt.value.substr(-5) != "_dmg_"));
            this.elements.selectStatAdd.value = "";
            break;
          case "circlet":
            Array.from(this.elements.selectStatAdd.options).forEach(statOpt => statOpt.disabled = (["hp_","atk_","def_","eleMas","critRate_","critDMG_","heal_"].indexOf(statOpt.value) == -1));
            this.elements.selectStatAdd.value = "";
            break;
          default:
            Array.from(this.elements.selectStatAdd.options).forEach(statOpt => statOpt.disabled = false);
        }
      };
      
      this.elements.selectStatAdd = inputGroup.appendChild(document.createElement("select"));
      this.elements.selectStatAdd.classList.add("form-select", "size-to-content");
      this.elements.selectStatAdd.title = "Artifact Main Stat";
      this.elements.selectStatAdd.appendChild(document.createElement("option"))
      for(let itm in Artifact.shorthandStat)
      {
        let option = this.elements.selectStatAdd.appendChild(document.createElement("option"));
        option.value = itm;
        option.innerHTML = Artifact.shorthandStat[itm];
      }
      
      this.elements.btnAdd = inputGroup.appendChild(document.createElement("button"));
      this.elements.btnAdd.innerHTML = "Add Artifact";
      this.elements.btnAdd.classList.add("btn", "btn-primary");
      this.elements.btnAdd.addEventListener("click", event => {
        if(this.elements.selectSetAdd.value && this.elements.selectSlotAdd.value && this.elements.selectStatAdd.value && this.elements.selectRarityAdd.value)
        {
          let item = this.addGOOD({
            id: this.list.reduce((c,i) => Math.max(c,i.id), 0)+1,
            setKey: this.elements.selectSetAdd.value,
            slotKey: this.elements.selectSlotAdd.value,
            mainStatKey: this.elements.selectStatAdd.value,
            rarity: this.elements.selectRarityAdd.value,
            level: 0,
            location: "",
            substats: [],
            lock: false,
          });
          this.elements.selectSetAdd.value = "";
          this.elements.selectSlotAdd.value = "";
          this.elements.selectStatAdd.value = "";
          this.elements.selectRarityAdd.value = "";
          //this.viewer.store();
          Renderer.renderNewItem(item, {exclude: field => field.tags.indexOf("detailsOnly") > -1});
        }
      });
      
      // Evaluate Artifacts
      let li2 = ul.appendChild(document.createElement("li"));
      li2.classList.add("nav-item", "me-2");
      
      let evalBtn = li2.appendChild(document.createElement("button"));
      evalBtn.id = "artifactEvaluateBtn";
      evalBtn.classList.add("btn", "btn-primary", "show-notice");
      evalBtn.title = "Recalculate the characters that might desire each artifact.";
      let evalIcon = evalBtn.appendChild(document.createElement("i"));
      evalIcon.classList.add("fa-solid", "fa-arrows-rotate");
      let evalNotice = evalBtn.appendChild(document.createElement("i"));
      evalNotice.classList.add("fa-solid", "fa-circle-exclamation", "notice");
      
      evalBtn.addEventListener("click", event => {
        evalIcon.classList.add("fa-spin");
        // Have to explicitly wait or else the interface will never register that fa-spin was added.
        setTimeout(() => {
          this.evaluate().then(result => evalIcon.classList.remove("fa-spin"));
        }, 1);
      });
      setTimeout(() => evalBtn.dispatchEvent(new Event("click")), 1);
    }
  }
}
