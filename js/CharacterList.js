import GenshinCharacterData from "./gamedata/GenshinCharacterData.js";

import { Renderer } from "./Renderer.js";
import GenshinList from "./GenshinList.js";
import Character from "./Character.js";
import Traveler from "./Traveler.js";
import Artifact from "./Artifact.js";

export default class CharacterList extends GenshinList
{
  static unique = true;
  static itemClass = [Character,Traveler];
  static subsetDefinitions = {
    'traveler': item => item instanceof Traveler,
    'nottraveler': item => !(item instanceof Traveler),
    'equippable': item => !(item instanceof Traveler) || !item.base,
    'listable': item => !(item instanceof Traveler) || item.base,
  };
  
  static fromJSON(data, options)
  {
    let list = super.fromJSON(data, options);
    list.addTraveler();
    return list;
  }
  
  setupDisplay()
  {
    let favorite = this.display.addField("favorite", {
      label: "F",
      labelTitle: "Mark certain characters as favorites, then click to sort them higher than others.",
      sort: {generic: {type:"boolean",property:"favorite"}},
      dynamic: true,
      title: item => `${item.favorite?"Unmark":"Mark"} Favorite`,
      edit: item => ({
        target: {item, field:"favorite"},
        type: "checkbox",
        value: item.favorite,
        trueClasses: ["fa-solid","fa-circle-check"],
        falseClasses: [],
      }),
    });
    
    let name = this.display.addField("name", {
      label: "Name",
      labelTitle: "Sort by name.",
      popup: true,
      sort: {generic: {type:"string",property:"name"}},
      dynamic: false,
      value: item => item.name,
      title: item => `Click to open a popup to examine ${item.name} in-depth.`,
    });
    
    let weaponType = this.display.addField("weaponType", {
      label: "Wpn",
      labelTitle: "Sort by weapon type.",
      sort: {generic: {type:"string",property:"weaponType"}},
      dynamic: false,
      title: item => item.weaponType,
      value: item => ({
        tag: "img",
        classes: {'weapon-icon':true},
        src: `img/Icon_${item.weaponType}.webp`,
      }),
      classes: item => ({
        'icon': true,
      }),
    });
    
    let element = this.display.addField("element", {
      label: "Elm",
      labelTitle: "Sort by element.",
      sort: {generic: {type:"string",property:"element"}},
      dynamic: false,
      title: item => item.element,
      value: item => ({
        tag: "img",
        classes: {'element-icon':true},
        src: `img/Element_${item.element}.svg`,
      }),
      classes: item => ({
        'icon': true,
      }),
    });
    
    let ascension = this.display.addField("ascension", {
      label: "Phs",
      labelTitle: "Sort by phase/ascension.",
      sort: {generic: {type:"number",property:"ascension"}},
      dynamic: true,
      title: item => "Click to change.",
      value: item => item.ascension,
      edit: item => ({target: {item:item.base??item, field:"ascension"}}),
      dependencies: item => [
        {item:item.base??item, field:"ascension"},
        {item:item.getMat('gem'), field:"count"},
        item.getMat('boss') ? {item:item.getMat('boss'), field:"count"} : null,
        {item:item.getMat('flower'), field:"count"},
        {item:item.getMat('enemy'), field:"count"},
      ].concat(item.getMat('gem').getCraftDependencies()).concat(item.getMat('enemy').getCraftDependencies()),
      button: item => {
        if(item.canUpPhase(false))
          return {
            icon: "fa-solid fa-circle-up",
            action: item.upPhase.bind(item),
          };
        else if(item.canUpPhase(true))
          return {icon: "fa-solid fa-circle-up"};
      },
    });
    
    let level = this.display.addField("level", {
      label: "Lvl",
      labelTitle: "Sort by character level.",
      sort: {generic: {type:"number",property:"level"}},
      dynamic: true,
      title: item => "Click to change.",
      value: item => item.level,
      edit: item => ({target: {item:item.base??item, field:"level"}}),
      classes: item => ({
        "pending": item.level < item.levelCap,
      }),
      dependencies: item => [
          {item:item.base??item, field:"level"},
          {item:item.getMat('gem'), field:"count"},
          item.getMat('boss') ? {item:item.getMat('boss'), field:"count"} : null,
          {item:item.getMat('flower'), field:"count"},
          {item:item.getMat('enemy'), field:"count"},
          {item:item.base??item, field:"ascension"},
        ].concat(item.getMat('gem').getCraftDependencies()).concat(item.getMat('enemy').getCraftDependencies()),
    });
    
    let constellation = this.display.addField("constellation", {
      label: "Con",
      labelTitle: "Sort by number of constellations.",
      sort: {generic: {type:"number",property:"constellation"}},
      dynamic: true,
      value: item => item.constellation,
      title: item => "Click to change.",
      edit: item => ({target: {item, field:"constellation"}}),
    });
    
    for(let i of ["auto","skill","burst"])
    {
      let talent = this.display.addField(i+"Talent", {
        label: "T"+ i.at(0).toUpperCase(),
        labelTitle: `Sort by "${i}" talent level.`,
        dynamic: true,
        value: item => item.talent[i],
        title: item => (item.getTalent(i).matTrounceCount ? `Also requires ${item.getTalent(i).matTrounceCount} ${item.MaterialList.trounce.name}, dropped by ${item.MaterialList.trounce.source} (you have ${item.MaterialList.trounce.getCraftCount()})` : ""),
        edit: item => ({target: {item, field:["talent", i]}}),
        sort: {generic: {type:"number",property:["talent",i]}},
        dependencies: item => [
            {item:item.getTalentMat('mastery',i), field:"count"},
            {item:item.getTalentMat('enemy',i), field:"count"},
            {item:item.base??item, field:"ascension"},
            item.getTalentMat('mastery',i).days ? {item:this.viewer, field:"today"} : {},
          ].concat(item.getTalentMat('mastery',i).getCraftDependencies()).concat(item.getTalentMat('enemy',i).getCraftDependencies()),
        button: item => {
          if(item.talent[i] < item.getPhase().maxTalent)
          {
            if(item.canUpTalent(i, false))
            {
              return {
                icon: "fa-solid fa-circle-up",
                action: item.upTalent.bind(item, i),
                classes: {
                  "sufficient": false,
                  "pending": false,
                  "insufficient": false,
                },
              };
            }
            else
            {
              return {
                icon: "fa-solid fa-circle-up",
                classes: {
                  "sufficient": item.canUpTalent(i, true),
                  "pending": item.getTalentMat('mastery',i).getCraftCount() < item.getTalent(i).matDomainCount &&
                             item.getTalentMat('mastery',i).days.indexOf(item.list.viewer.today()) > -1,
                  "insufficient": item.getTalentMat('mastery',i).getCraftCount() < item.getTalent(i).matDomainCount &&
                                  item.getTalentMat('mastery',i).days.indexOf(item.list.viewer.today()) == -1,
                },
              };
            }
          }
          return null;
        },
      });
    }
    
    let mats = [
      {t:"gem",l:"Gems"},
      {t:"boss",l:"World Boss Drops"},
      {t:"flower",l:"Flora"},
      {t:"enemy",l:"Enemy Drops"},
    ];
    let ascGroup = {label:"Ascension Materials"};
    for(let phase of [undefined,0,1,2,3,4,5])
    {
      for(let mat of mats)
      {
        let ascMaterial = this.display.addField(mat.t+"AscMat"+(phase??""), {
          group: ascGroup,
          label: mat.l,
          sort: isNaN(phase) ? {func: (o,a,b) => {
            let A = a.getMat(mat.t,phase)?.shorthand??"";
            let B = b.getMat(mat.t,phase)?.shorthand??"";
            if(!A && B)
              return 1;
            else if(A && !B)
              return -1;
            else if(!A && !B)
              return 0;
            else
              return o*A.localeCompare(B);
          }} : undefined,
          columnClasses: ["ascension-materials"],
          tags: isNaN(phase) ? undefined : ["detailsOnly"],
          dynamic: true,
          value: item => item.getMat(mat.t,phase) && item.getMatCost(mat.t,phase) ? item.getMat(mat.t,phase).getFieldValue(item.getMatCost(mat.t,phase)) : "",
          dependencies: item => [
            {item:item.base??item, field:"ascension"},
          ].concat(item.getMat(mat.t,phase)?.getCraftDependencies() ?? []),
        });
      }
      if(!isNaN(phase))
      {
        let ascPhase = this.display.addField("ascension"+phase, {
          label: "Phs"+phase,
          tags: ["detailsOnly"],
          dynamic: true,
          value: item => `${phase} ➤ ${phase+1}`,
          dependencies: item => [
            {item:item.getMat('gem',phase), field:"count"},
            item.getMat('boss',phase) ? {item:item.getMat('boss',phase), field:"count"} : null,
            {item:item.getMat('flower',phase), field:"count"},
            {item:item.getMat('enemy',phase), field:"count"},
            {item:item.base??item, field:"ascension"},
          ],
          button: item => {
            if(phase == item.ascension)
            {
              if(item.canUpPhase(false))
              {
                return {
                  icon: "fa-solid fa-circle-up",
                  action: item.upPhase.bind(item),
                };
              }
              else
              {
                return {
                  icon: "fa-solid fa-circle-up",
                };
              }
            }
          },
        });
      }
    }
    
    let talGroup = {label:"Talent Materials", startCollapsed:true};
    for(let i of ["auto","skill","burst",1,2,3,4,5,6,7,8,9])
    {
      for(let m of [{l:"Mastery",d:"Domain"},{l:"Enemy",d:"Enemy"},{l:"Trounce",d:"Trounce"},{l:"Crown",d:"Crown"}])
      {
        let talentMat = this.display.addField(isNaN(i) ? i+m.l+"Mat" : "talent"+m.l+"Mat"+i, {
          group: talGroup,
          label: m.l + (isNaN(i) ? ` (${i})` : ""),
          sort: isNaN(i) ? {func: (o,a,b) => {
            let A = a.getTalentMatType(m.l.toLowerCase(),i)??"";
            let B = b.getTalentMatType(m.l.toLowerCase(),i)??"";
            if(!A && B)
              return 1;
            else if(A && !B)
              return -1;
            else if(!A && !B)
              return 0;
            else
              return o*A.localeCompare(B);
          }} : undefined,
          columnClasses: [(isNaN(i)?i:"talent")+'-'+m.l.toLowerCase()],
          tags: isNaN(i) & m.l != "Trounce" && m.l != "Crown" ? undefined : ["detailsOnly"],
          dynamic: true,
          value: item => item.getTalentMat(m.l.toLowerCase(),i) && item.getTalent(i)['mat'+m.d+'Count'] ? item.getTalentMat(m.l.toLowerCase(),i).getFieldValue(item.getTalent(i)['mat'+m.d+'Count']) : "",
          title: item => item.getTalentMat(m.l.toLowerCase(),i).getFullSource(),
          dependencies: item => [
            {item, field:["talent", i]},
            item.getTalentMat(m.l.toLowerCase(),i).days ? {item:this.viewer, field:"today"} : {},
          ].concat(item.getTalentMat(m.l.toLowerCase(),i).getCraftDependencies()),
        });
      }
      if(!isNaN(i))
      {
        let talentLvl = this.display.addField("talentLvl"+i, {
          label: "TLvl"+i,
          tags: ["detailsOnly"],
          dynamic: true,
          value: item => `${i} ➤ ${i+1}`,
          dependencies: item => [
            {item:item.getTalentMat('mastery','auto'), field:"count"},
            {item:item.getTalentMat('enemy','auto'), field:"count"},
            {item:item.getTalentMat('mastery','skill'), field:"count"},
            {item:item.getTalentMat('enemy','skill'), field:"count"},
            {item:item.getTalentMat('mastery','burst'), field:"count"},
            {item:item.getTalentMat('enemy','burst'), field:"count"},
            {item:item.base??item, field:"ascension"},
          ],
          button: item => [
            (item.talent.auto != i) ? null : {
              name: "auto",
              text: "auto",
              icon: item.talent.auto < item.getPhase().maxTalent ? "fa-solid fa-circle-up" : undefined,
              action: item.talent.auto < item.getPhase().maxTalent && item.canUpTalent('auto', false) ? item.upTalent.bind(item, 'auto') : undefined,
            },
            (item.talent.skill != i) ? null : {
              name: "skill",
              text: "skill",
              icon: item.talent.skill < item.getPhase().maxTalent ? "fa-solid fa-circle-up" : undefined,
              action: item.talent.skill < item.getPhase().maxTalent && item.canUpTalent('skill', false) ? item.upTalent.bind(item, 'skill') : undefined,
            },
            (item.talent.burst != i) ? null : {
              name: "burst",
              text: "burst",
              icon: item.talent.burst < item.getPhase().maxTalent ? "fa-solid fa-circle-up" : undefined,
              action: item.talent.burst < item.getPhase().maxTalent && item.canUpTalent('burst', false) ? item.upTalent.bind(item, 'burst') : undefined,
            },
          ],
        });
      }
    }
    
    let ascendStat = this.display.addField("ascendStat", {
      label: "Stat",
      sort: {generic: {type:"string",property:"ascendStat"}},
      tags: ["detailsOnly"],
      dynamic: false,
      value: item => Artifact.shorthandStat[item.ascendStat],
    });
    
    for(let stat of ['critRate_','critDMG_','eleMas','enerRech_','heal_'])
    {
      let statCurrent = this.display.addField(stat+"Current", {
        label: Artifact.shorthandStat[stat],
        tags: ["detailsOnly"],
        dynamic: true,
        title: item => item.getStat(stat),
        value: item => item.getStat(stat).toFixed(stat=="eleMas"?0:1),
        dependencies: item => [
          {item:item.base??item, field:"ascension"},
          {item:item.base??item, field:"level"},
          item.weapon ? {item:item.weapon, field:"location"} : null,
          item.weapon ? {item:item.weapon, field:"ascension"} : null,
          item.weapon ? {item:item.weapon, field:"level"} : null,
          item.flowerArtifact ? {item:item.flowerArtifact, field:"location"} : null,
          item.flowerArtifact ? {item:item.flowerArtifact, field:"level"} : null,
          item.flowerArtifact ? {item:item.flowerArtifact, field:"substats"} : null,
          item.plumeArtifact ? {item:item.plumeArtifact, field:"location"} : null,
          item.plumeArtifact ? {item:item.plumeArtifact, field:"level"} : null,
          item.plumeArtifact ? {item:item.plumeArtifact, field:"substats"} : null,
          item.sandsArtifact ? {item:item.sandsArtifact, field:"location"} : null,
          item.sandsArtifact ? {item:item.sandsArtifact, field:"level"} : null,
          item.sandsArtifact ? {item:item.sandsArtifact, field:"substats"} : null,
          item.gobletArtifact ? {item:item.gobletArtifact, field:"location"} : null,
          item.gobletArtifact ? {item:item.gobletArtifact, field:"level"} : null,
          item.gobletArtifact ? {item:item.gobletArtifact, field:"substats"} : null,
          item.circletArtifact ? {item:item.circletArtifact, field:"location"} : null,
          item.circletArtifact ? {item:item.circletArtifact, field:"level"} : null,
          item.circletArtifact ? {item:item.circletArtifact, field:"substats"} : null,
        ],
      });
    }
    
    let gearGroup = {label:"Gear", startCollapsed:true};
    /*
    // Note: This is a potential future implementation, for future reference.
    let weaponName = this.display.transferField(this.viewer.lists.WeaponList.display.getField("name"), "weaponName", {
      item: item => item.weapon,
      group: gearGroup,
      label: "Weapon",
      dynamic: true,
      dependencies: item => [
        item.weapon ? {item:item.weapon, field:"location"} : undefined,
        item.weapon ? {item:item.weapon, field:"refinement"} : undefined,
        item.weapon ? {item:item.weapon, field:"level"} : undefined,
        {type:"weapon"},
      ],
    });
    */
    let weaponName = this.display.addField("weaponName", {
      group: gearGroup,
      label: "Weapon",
      dynamic: true,
      popup: item => item.weapon,
      value: item => item.weapon ? [
        {
          value: item.weapon.display.getField("name").get("value", item.weapon),
          classes: item.weapon.display.getField("name").get("classes", item.weapon),
        },
        {
          value: `R${item.weapon.refinement}, Lv.${item.weapon.level}`,
        },
      ] : "",
      title: item => item.weapon ? `Click to open a popup to examine ${item.weapon.name} in-depth.` : "",
      dependencies: item => [
        item.weapon ? {item:item.weapon, field:"location"} : undefined,
        item.weapon ? {item:item.weapon, field:"refinement"} : undefined,
        item.weapon ? {item:item.weapon, field:"level"} : undefined,
        {type:"weapon"},
      ],
    });
    
    for(let slotKey of ["flower","plume","sands","goblet","circlet"])
    {
      let artifactField = this.display.addField(slotKey, {
        group: gearGroup,
        label: slotKey,
        dynamic: true,
        //popup: item => item[slotKey+'Artifact'],
        value: item => {
          let artifact = item[slotKey+'Artifact'];
          return artifact ? [
            {
              value: artifact.display.getField("set").get("value", artifact),
              classes: artifact.display.getField("set").get("classes", artifact),
            },
            {
              //value: `+${artifact.level}, ${Math.round(artifact.getCharacterScore(item)*100).toFixed(0)}%`,
              value: `+${artifact.level}`,
            },
          ] : "";
        },
        dependencies: item => [
          item[slotKey+'Artifact'] ? {item:item[slotKey+'Artifact'], field:"location"} : undefined,
          item[slotKey+'Artifact'] ? {item:item[slotKey+'Artifact'], field:"level"} : undefined,
          {type:slotKey+'Artifact'},
        ],
      });
    }
    
    let imageField = this.display.addField("image", {
      label: "Image",
      tags: ["detailsOnly"],
      dynamic: false,
      value: item => {
        let src;
        if(item.base || item.variants)
          src = `https://rerollcdn.com/GENSHIN/Characters/1/Traveler%20(Anemo).png`;
        else if(item.key == "RaidenShogun")
          src = `https://rerollcdn.com/GENSHIN/Characters/1/Raiden.png`;
        else if(item.key == "Tartaglia")
          src = `https://rerollcdn.com/GENSHIN/Characters/1/Childe.png`;
        else if(item.key == "KukiShinobu")
          src = `https://rerollcdn.com/GENSHIN/Characters/1/Kuki%20Shinobu.png`;
        else
        {
          let filename = item.name;
          if(filename.length > 8)
            filename = filename.substring(filename.indexOf(" ")+1);
          src = `https://rerollcdn.com/GENSHIN/Characters/1/${filename}.png`;
        }
        return {
          tag: "img",
          src: src,
        };
      },
    });
    
    let considerField = this.display.addField("consider", {
      label: "Consider",
      tags: ["detailsOnly"],
      dynamic: true,
      value: "Consider in Calculations",
      title: item => `Consider ${item.name}'s preferences in the calculation that determines artifact desirability.`,
      edit: item => ({
        target: {item, field:"consider"},
        type: "checkbox",
        value: item.consider,
        trueClasses: ["fa-solid","fa-circle-check"],
        falseClasses: [],
      }),
    });
  }
  
  addTraveler()
  {
    let base = this.get("Traveler");
    let anemo = this.get("TravelerAnemo");
    let geo = this.get("TravelerGeo");
    let electro = this.get("TravelerElectro");
    let dendro = this.get("TravelerDendro");
    
    if(!base)
    {
      base = Traveler.fromJSON({__class__:"Traveler",key:"Traveler"}, {addProperties:{list:this}});
      this.update("list", base, "push");
    }
    if(!anemo)
    {
      anemo = Traveler.fromJSON({__class__:"Traveler",key:"TravelerAnemo"}, {addProperties:{list:this}});
      this.update("list", anemo, "push");
    }
    if(!geo)
    {
      geo = Traveler.fromJSON({__class__:"Traveler",key:"TravelerGeo"}, {addProperties:{list:this}});
      this.update("list", geo, "push");
    }
    if(!electro)
    {
      electro = Traveler.fromJSON({__class__:"Traveler",key:"TravelerElectro"}, {addProperties:{list:this}});
      this.update("list", electro, "push");
    }
    if(!dendro)
    {
      dendro = Traveler.fromJSON({__class__:"Traveler",key:"TravelerDendro"}, {addProperties:{list:this}});
      this.update("list", dendro, "push");
    }
    
    anemo.base = base;
    geo.base = base;
    electro.base = base;
    dendro.base = base;
    
    base.variants = [anemo,geo,electro,dendro];
  }
  
  fromGOOD(goodData)
  {
    let result = super.fromGOOD(goodData);
    this.addTraveler();
    return result;
  }
  
  createItem(goodData)
  {
    let item;
    if(goodData.key.startsWith("Traveler"))
      item = new Traveler();
    else
      item = new Character();
    item.list = this;
    item.fromGOOD(goodData);
    this.update("list", item, "push");
    return item;
  }
  
  clear()
  {
    this.items("nottraveler").forEach(item => item.unlink());
    this.update("list", this.items("traveler"), "replace");
    this.subsets = {};
    this.forceNextRender = true;
  }
  
  prepareRender(element, data, options)
  {
    data.filter = "listable";
    return {element, data, options};
  }
  
  async render(force=false)
  {
    await super.render(force);
    
    let selectAdd;
    let footer = document.getElementById("footer");
    footer.classList.remove("d-none");
    if(footer.dataset.list != this.uuid)
    {
      footer.replaceChildren();
      footer.dataset.list = this.uuid;
      
      let divAdd = footer.appendChild(document.createElement("div"));
      divAdd.classList.add("input-group", "mt-2");
      selectAdd = divAdd.appendChild(document.createElement("select"));
      selectAdd.id = "addCharacterSelect";
      selectAdd.classList.add("form-select", "size-to-content");
      let btnAdd = divAdd.appendChild(document.createElement("button"));
      btnAdd.innerHTML = "Add Character";
      btnAdd.classList.add("btn", "btn-primary");
      btnAdd.addEventListener("click", async event => {
        let selectAdd = document.getElementById("addCharacterSelect");
        if(selectAdd.value)
        {
          let item = this.addGOOD({
            key: selectAdd.value,
            level: 1,
            constellation: 0,
            ascension: 0,
            talent: {
              auto: 1,
              skill: 1,
              burst: 1,
            },
          });
          selectAdd.needsUpdate = true;
          Renderer.renderNewItem(item, {exclude: field => field.tags.indexOf("detailsOnly") > -1});
        }
      });
    }
    selectAdd = document.getElementById("addCharacterSelect");
    if(!selectAdd.children.length || selectAdd.needsUpdate)
    {
      selectAdd.replaceChildren();
      selectAdd.appendChild(document.createElement("option"))
      for(let chara in GenshinCharacterData)
      {
        if(!this.get(chara))
        {
          let option = selectAdd.appendChild(document.createElement("option"));
          option.value = chara;
          option.innerHTML = GenshinCharacterData[chara].name;
        }
      }
    }
  }
}
