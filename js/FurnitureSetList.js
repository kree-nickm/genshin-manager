import GiftSets from "./gamedata/GiftSets.js";

import { Renderer } from "./Renderer.js";
import GenshinList from "./GenshinList.js";
import FurnitureSet from "./FurnitureSet.js";

export default class FurnitureSetList extends GenshinList
{
  static unique = true;
  static itemClass = FurnitureSet;
  
  initialize()
  {
    for(let s in GiftSets)
    {
      this.addGOOD({key:s, learned:false, settled:[]});
    }
  }
  
  setupDisplay()
  {
    let nameField = this.display.addField("name", {
      label: "Set Name",
      dynamic: false,
      value: item => item.name,
    });
    
    let learnedField = this.display.addField("learned", {
      label: "?",
      sort: {generic: {type:"boolean",property:"learned"}},
      dynamic: true,
      title: item => "Is Learned?",
      edit: item => ({
        target: {item:item, field:"learned"},
        type: "checkbox",
        value: item.learned,
        trueClasses: ["fa-solid","fa-scroll"],
        falseClasses: [],
      }),
    });
    
    let recipeField = this.display.addField("recipe", {
      label: "Furniture",
      dynamic: true,
      value: item => item.furniture.map((furniture,i) => {
        return {
          tag: "div",
          value: [
            {
              value: `${furniture.count} / ${item.recipe[i].count}`,
              title: `Change the amount of ${furniture.name} you own.`,
              classes: {
                "quantity": true,
                "insufficient": furniture.count < item.recipe[i].count,
              },
              edit: {target: {item:furniture, field:"count"}},
            },
            {
              value: furniture.name,
              title: `Toggle whether you've learned the schematic for ${furniture.name} yet.`,
              edit: {
                target: {item:furniture, field:"learned"},
                type: "checkbox",
                value: furniture.learned,
                trueClasses: ["fa-regular","fa-circle-dot"],
                falseClasses: ["fa-regular","fa-circle"],
                prepend: true,
              },
            },
          ], 
        };
      }),
      dependencies: item => item.furniture.map(furniture => ({item:furniture, field:"count"})),
    });
    
    let charactersField = this.display.addField("characters", {
      label: "Characters",
      dynamic: true,
      value: item => item.characters.map(c => {
        let character = this.viewer.lists.CharacterList.get(c);
        if(character)
          return {
            tag: "div",
            value: character.name,
            title: item.learned ? `Toggle whether ${character.name} has given you your primogem rewards for settling into ${item.name} yet.` : null,
            classes: {'not-owned':false},
            edit: item.learned ? {
              target: {item:item, field:"settled"},
              type: "checkbox",
              value: c,
              checked: item.settled.indexOf(c) > -1,
              trueClasses: ["fa-solid","fa-house-circle-check"],
              falseClasses: ["fa-regular","fa-envelope"],
            } : null,
          };
        else
          return {tag:"div", value:c, classes:{'not-owned':true}};
      }),
      dependencies: item => [
        {item:item, field:"learned"},
        {item:item, field:"settled"},
        {item:item.list.viewer.lists.characters, field:"list"},
      ]
    });
  }
  
  clear()
  {
    for(let item of this.list)
    {
      item.update("learned", false);
      item.update("settled", [], "replace");
    }
  }
  
  async render(force=false)
  {
    await super.render(force);
    
    let footer = document.getElementById("footer");
    footer.classList.add("d-none");
  }
}
