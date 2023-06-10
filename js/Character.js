import GenshinLootData from "./gamedata/GenshinLootData.js";
import GenshinPhaseData from "./gamedata/GenshinPhaseData.js";
import GenshinTalentData from "./gamedata/GenshinTalentData.js";
import GenshinCharacterData from "./gamedata/GenshinCharacterData.js";
import GenshinArtifactData from "./gamedata/GenshinArtifactData.js";
import GenshinBuilds from "./gamedata/GenshinBuilds.js";

import { Renderer } from "./Renderer.js";
import GenshinItem from "./GenshinItem.js";
import Artifact from "./Artifact.js";
import Material from "./Material.js";

export default class Character extends GenshinItem
{
  static dontSerialize = GenshinItem.dontSerialize.concat(["materials","weapon","flowerArtifact","plumeArtifact","sandsArtifact","gobletArtifact","circletArtifact","materials"]);
  static templateName = "renderCharacterAsPopup";
  static templateTitleName = "renderCharacterAsPopupTitle";
  static statBase = {
    critRate_: 5,
    critDMG_: 50,
    enerRech_: 100,
  };
  static ascendStatProgression = {
    '4': {
      anemo_dmg_: [0,0,6,12,12,18,24],
      cryo_dmg_: [0,0,6,12,12,18,24],
      dendro_dmg_: [0,0,6,12,12,18,24],
      electro_dmg_: [0,0,6,12,12,18,24],
      geo_dmg_: [0,0,6,12,12,18,24],
      hydro_dmg_: [0,0,6,12,12,18,24],
      pyro_dmg_: [0,0,6,12,12,18,24],
      atk_: [0,0,6,12,12,18,24],
      hp_: [0,0,6,12,12,18,24],
      critDMG_: null,
      critRate_: null,
      def_: [0,0,7.5,15,15,22.5,30],
      physical_dmg_: [0,0,7.5,15,15,22.5,30],
      eleMas: [0,0,24,48,48,72,96],
      enerRech_: [0,0,6.7,13.4,13.4,20.1,26.8],
      heal_: null,
    },
    '5': {
      anemo_dmg_: [0,0,7.2,14.4,14.4,21.6,28.8],
      cryo_dmg_: [0,0,7.2,14.4,14.4,21.6,28.8],
      dendro_dmg_: [0,0,7.2,14.4,14.4,21.6,28.8],
      electro_dmg_: [0,0,7.2,14.4,14.4,21.6,28.8],
      geo_dmg_: [0,0,7.2,14.4,14.4,21.6,28.8],
      hydro_dmg_: [0,0,7.2,14.4,14.4,21.6,28.8],
      pyro_dmg_: [0,0,7.2,14.4,14.4,21.6,28.8],
      atk_: [0,0,7.2,14.4,14.4,21.6,28.8],
      hp_: [0,0,7.2,14.4,14.4,21.6,28.8],
      critDMG_: [0,0,9.6,19.2,19.2,28.8,38.4],
      critRate_: [0,0,4.8,9.6,9.6,14.4,19.2],
      def_: null,
      physical_dmg_: null,
      eleMas: [0,0,28.8,57.6,57.6,86.4,115.2],
      enerRech_: [0,0,8,16,16,24,32],
      heal_: [0,0,5.5,11,11,16.5,22],
    },
  };
  
  static sortArtifacts(buildId,a,b)
  {
    let A = parseFloat(a.getCharacterScore(this,20,buildId));
    let B = parseFloat(b.getCharacterScore(this,20,buildId));
    if(isNaN(A) && !isNaN(B))
      return 1;
    else if(!isNaN(A) && isNaN(B))
      return -1;
    else if(isNaN(A) && isNaN(B))
      return 0;
    else
      return (B-A);
  }
  
  #constellation = 0;
  #ascension = 0;
  #level = 1;
  #weapon;
  loaded = false;
  favorite = false;
  maxScores = {};
  materials;
  weapon;
  flowerArtifact;
  plumeArtifact;
  sandsArtifact;
  gobletArtifact;
  circletArtifact;
  
  afterLoad()
  {
    this.materials = {crown: this.list.viewer.lists.materials.get("Crown Of Insight")};
    if(GenshinCharacterData[this.key])
    {
      this.loaded = true;
      
      // Retrieve the materials used by this character.
      this.materials.gem = {
        '2': this.list.viewer.lists.materials.get(GenshinLootData.gemstone[this.element].prefix + Material.gemQualities[2]),
        '3': this.list.viewer.lists.materials.get(GenshinLootData.gemstone[this.element].prefix + Material.gemQualities[3]),
        '4': this.list.viewer.lists.materials.get(GenshinLootData.gemstone[this.element].prefix + Material.gemQualities[4]),
        '5': this.list.viewer.lists.materials.get(GenshinLootData.gemstone[this.element].prefix + Material.gemQualities[5]),
      };
      this.materials.boss = this.list.viewer.lists.materials.get(GenshinLootData.boss[this.bossMatType][4]);
      this.materials.flower = this.list.viewer.lists.materials.get(this.flowerMatType);
      this.materials.enemy = {
        '1': this.list.viewer.lists.materials.get(GenshinLootData.enemy[this.enemyMatType][1]),
        '2': this.list.viewer.lists.materials.get(GenshinLootData.enemy[this.enemyMatType][2]),
        '3': this.list.viewer.lists.materials.get(GenshinLootData.enemy[this.enemyMatType][3]),
      };
      this.materials.mastery = {
        '2': this.list.viewer.lists.materials.get(Material.masteryQualities[2] + this.getTalentMatType('mastery')),
        '3': this.list.viewer.lists.materials.get(Material.masteryQualities[3] + this.getTalentMatType('mastery')),
        '4': this.list.viewer.lists.materials.get(Material.masteryQualities[4] + this.getTalentMatType('mastery')),
      };
      this.materials.trounce = this.list.viewer.lists.materials.get(this.getTalentMatType('trounce'));
      
      // Inform those materials that this character uses them.
      for(let i in this.materials.gem)
        this.materials.gem[i].addUser(this);
      
      for(let i in this.materials.enemy)
        this.materials.enemy[i].addUser(this);
      
      if(this.materials.boss)
        this.materials.boss.addUser(this);
      
      this.materials.flower.addUser(this);
        
      for(let i in this.materials.mastery)
        this.materials.mastery[i].addUser(this);
      
      this.materials.trounce.addUser(this);
      this.materials.crown.addUser(this);
    }
    else
    {
      console.warn(`Unknown character "${this.key}".`);
      this.loaded = false;
    }
    return this.loaded;
  }
  
  toGOOD()
  {
    let result = super.toGOOD();
    result.favorite = this.favorite;
    return result;
  }
  
  equipItem(item)
  {
    // Determine the name of the property on this character that stores items of this type.
    let property;
    if(item.constructor.name == "Weapon")
      property = 'weapon';
    else if(item.constructor.name == "Artifact")
      property = item.slotKey +'Artifact';
    else
    {
      console.error(`${this.name} cannot equip unknown item type '${item.constructor.name}'.`);
      return this;
    }
    
    // Make note of existing equips and then unequip them.
    let previousCharacter = item.character;
    item.character = null;
    let previousItem = this[property];
    this[property] = null;
    
    // If we had an item equipped, and the new item was equipped to another character, give that character our old item.
    if(previousItem && previousCharacter)
    {
      //console.log(`Swapping previous item '${previousItem.name}' to '${previousCharacter.name}'.`);
      previousItem.update("location", previousCharacter.key);
    }
    // If we had an item equipped, let it know it is now unequipped.
    else if(previousItem)
    {
      //console.log(`Setting item '${previousItem.name}' to unequipped.`);
      previousItem.update("location", "");
    }
    // If the new item was equipped to another character, delete the reference to the item.
    else if(previousCharacter)
    {
      //console.log(`Setting character '${previousCharacter}' ${property} slot to unequipped.`);
      previousCharacter[property] = null;
    }
    else
    {
      //console.log(`Character had no previous item and item had no previous character.`);
    }
    
    // Notify character item display that it needs to update.
    let charsToUpdate = (this.constructor.name == "Traveler") ? this.variants : [this];
    for(let cha of charsToUpdate)
      for(let cell of cha.elements?.tr?.children ?? [])
        for(let dep of cell.dependencies ?? [])
          if(dep?.type == item.constructor.name.toLowerCase())
            cell.needsUpdate = true;
    
    // Finally, set the references on this character and the item to each other.
    this[property] = item;
    item.character = this;
    return this;
  }
  
  // Getters/setters that enforce a value range.
  get weapon(){ return this.#weapon; }
  set weapon(val){ this.#weapon = val; }
  get constellation(){ return this.#constellation; }
  set constellation(val){ this.#constellation = Math.min(Math.max(val, 0), 6); }
  get ascension(){ return this.#ascension; }
  set ascension(val){ this.#ascension = Math.min(Math.max(val, 0), 6); }
  get level(){ return this.#level; }
  set level(val){ this.#level = Math.min(Math.max(val, 1), 90); }
  
  // Getters/setters for genshin item data that is not stored on each instance of this class.
  get name(){ return this.loaded ? GenshinCharacterData[this.key].name : this.key; }
  get weaponType(){ return this.loaded ? GenshinCharacterData[this.key].weapon : ""; }
  get element(){ return this.loaded ? GenshinCharacterData[this.key].element : ""; }
  get rarity(){ return this.loaded ? GenshinCharacterData[this.key].rarity : 0; }
  get ascendStat(){ return this.loaded ? GenshinCharacterData[this.key].ascendStat : ""; }
  get bossMatType(){ return this.loaded ? GenshinCharacterData[this.key].matBoss : ""; }
  get flowerMatType(){ return this.loaded ? GenshinCharacterData[this.key].matFlower : ""; }
  get enemyMatType(){ return this.loaded ? GenshinCharacterData[this.key].matEnemy : ""; }
  
  getPhase(ascension=this.ascension){ return GenshinPhaseData[ascension] ?? GenshinPhaseData[6]; }
  get levelCap(){ return this.getPhase().levelCap; }
  
  getBuilds()
  {
    if(this.loaded)
    {
      let builds = this.list.viewer.buildData[this.key] ?? {};
      if(!builds.default)
        builds.default = {};
      for(let b in builds)
      {
        if(!builds[b].artifactSets)
          builds[b].artifactSets = {};
        if(!builds[b].artifactSubstats)
          builds[b].artifactSubstats = {};
        if(!builds[b].sandsStat)
          builds[b].sandsStat = {};
        if(!builds[b].gobletStat)
          builds[b].gobletStat = {};
        if(!builds[b].circletStat)
          builds[b].circletStat = {};
      }
      return builds;
    }
    else
      return {};
  }
  
  getBuild(build="default")
  {
    if(this.getBuilds()[build])
      return this.getBuilds()[build];
    else
    {
      console.warn(`${this.name} has no build '${build}'.`);
      return {};
    }
  }
  
  getMat(type, ascension=this.ascension)
  {
    if(type == "gem")
      return this.materials.gem[this.getPhase(ascension).ascendMatGemQuality];
    else if(type == "boss")
      return this.materials.boss;
    else if(type == "flower")
      return this.materials.flower;
    else if(type == "enemy")
      return this.materials.enemy[this.getPhase(ascension).ascendMatEnemyQuality];
    else
      return null;
  }
  
  getMatCost(type, ascension=this.ascension)
  {
    if(type == "gem")
      return this.getPhase(ascension).ascendMatGemCount;
    else if(type == "boss")
      return this.getPhase(ascension).ascendMatBossCount;
    else if(type == "flower")
      return this.getPhase(ascension).ascendMatFlowerCount;
    else if(type == "enemy")
      return this.getPhase(ascension).ascendMatEnemyCount;
    else
      return 0;
  }
  
  getTalent(talent){ return GenshinTalentData[this.talent[talent] ?? talent] ?? GenshinTalentData[10]; }
  getTalentMat(type, talent)
  {
    if(type == "mastery")
      return this.materials.mastery[this.getTalent(talent).matDomainQuality];
    else if(type == "enemy")
      return this.materials.enemy[this.getTalent(talent).matEnemyQuality];
    else if(type == "trounce")
      return this.materials.trounce;
    else if(type == "crown")
      return this.materials.crown;
    else
      return null;
  }
  
  getTalentMatType(type, talent)
  {
    if(type == "mastery")
      return this.loaded ? GenshinCharacterData[this.key].matMastery : "";
    else if(type == "enemy")
      return this.loaded ? GenshinCharacterData[this.key].matEnemy : "";
    else if(type == "trounce")
      return this.loaded ? GenshinCharacterData[this.key].matTrounce : "";
    else if(type == "crown")
      return "Crown";
    else
      return "";
  }
  
  upPhase(event)
  {
    if(this.ascension == 6)
    {
      console.error(`Tried to ascend ${this.name}, but already at max.`);
      return false;
    }
    event.stopPropagation();
    this.getMat('gem').update("count", this.getMat('gem').count - this.getMatCost('gem'));
    if(this.getMat('boss'))
      this.getMat('boss').update("count", this.getMat('boss').count - this.getMatCost('boss'));
    this.getMat('flower').update("count", this.getMat('flower').count - this.getMatCost('flower'));
    this.getMat('enemy').update("count", this.getMat('enemy').count - this.getMatCost('enemy'));
    if(this.level < this.levelCap)
      this.update("level", this.levelCap);
    this.update("ascension", this.ascension+1);
    this.list.viewer.store();
    this.list.render();
  }
  
  canUpPhase(withCrafting=false)
  {
    if(this.ascension == 6)
      return false;
    else if(withCrafting)
      return this.getMat('gem').getCraftCount() >= this.getMatCost('gem') &&
        (!this.getMat('boss') || this.getMat('boss').getCraftCount() >= this.getMatCost('boss')) &&
        this.getMat('flower').getCraftCount() >= this.getMatCost('flower') &&
        this.getMat('enemy').getCraftCount() >= this.getMatCost('enemy');
    else
      return this.getMat('gem').count >= this.getMatCost('gem') &&
        (!this.getMat('boss') || this.getMat('boss').count >= this.getMatCost('boss')) &&
        this.getMat('flower').count >= this.getMatCost('flower') &&
        this.getMat('enemy').count >= this.getMatCost('enemy');
  }
  
  upTalent(talent, event)
  {
    if(this.talent[talent] == 10)
    {
      console.error(`Tried to increase ${talent} talent of ${this.name}, but already at max.`);
      return false;
    }
    event.stopPropagation();
    this.getTalentMat('mastery',talent).update("count", this.getTalentMat('mastery',talent).count - this.getTalent(talent).matDomainCount);
    this.getTalentMat('enemy',talent).update("count", this.getTalentMat('enemy',talent).count - this.getTalent(talent).matEnemyCount);
    this.materials.trounce.update("count", this.materials.trounce.count - this.getTalent(talent).matTrounceCount);
    this.materials.crown.update("count", this.materials.crown.count - this.getTalent(talent).matCrownCount);
    this.update(["talent", talent], this.talent[talent]+1);
    this.list.viewer.store();
    this.list.render();
  }
  
  canUpTalent(talent, withCrafting=false)
  {
    if(this.talent[talent] == 10)
      return false;
    else if(withCrafting)
      return this.getTalentMat('mastery',talent).getCraftCount() >= this.getTalent(talent).matDomainCount &&
        this.getTalentMat('enemy',talent).getCraftCount() >= this.getTalent(talent).matEnemyCount &&
        this.materials.trounce.getCraftCount() >= this.getTalent(talent).matTrounceCount &&
        this.materials.crown.getCraftCount() >= this.getTalent(talent).matCrownCount;
    else
      return this.getTalentMat('mastery',talent).count >= this.getTalent(talent).matDomainCount &&
        this.getTalentMat('enemy',talent).count >= this.getTalent(talent).matEnemyCount &&
        this.materials.trounce.count >= this.getTalent(talent).matTrounceCount &&
        this.materials.crown.count >= this.getTalent(talent).matCrownCount;
  }
  
  getStat(stat)
  {
    let result = Character.statBase[stat] ?? 0;
    if(this.ascendStat == stat)
      result += Character.ascendStatProgression[this.rarity][this.ascendStat][this.ascension];
    if(this.weapon?.stat == stat)
      result += this.weapon.getStat();
    for(let slot of ['flower','plume','sands','goblet','circlet'])
    {
      let prop = slot + 'Artifact';
      if(this[prop])
      {
        if(this[prop].mainStatKey == stat)
          result += this[prop].mainStatValue;
        result += this[prop]?.getSubstatSum(stat) ?? 0;
      }
    }
    result += this.getSetBonus().stats[stat] ?? 0;
    return result;
  }
  
  getSetBonus()
  {
    let sets = {};
    for(let slot of ['flower','plume','sands','goblet','circlet'])
    {
      let prop = slot + 'Artifact';
      if(this[prop])
      {
        if(!sets[this[prop].setKey])
          sets[this[prop].setKey] = {count:0};
        sets[this[prop].setKey].count++;
      }
    }
    
    // Collect the current bonuses and their code.
    let bonuses = [];
    let codes = [];
    for(let set in sets)
    {
      for(let i=1; i<=sets[set].count; i++)
      {
        let b = 'bonus'+i;
        let c = 'bonus'+i+'code';
        if(GenshinArtifactData[set][b])
          bonuses.push([set, i, GenshinArtifactData[set][b]]);
        if(GenshinArtifactData[set][c])
        {
          if(Array.isArray(GenshinArtifactData[set][c][0]))
            codes = codes.concat(GenshinArtifactData[set][c]);
          else
            codes.push(GenshinArtifactData[set][c]);
        }
      }
    }
    
    // Handle the codes.
    let substats = [];
    let stats = {};
    for(let code of codes)
    {
      if(code[0] == "proc")
      {
      }
      else if(code[0] == "stat")
      {
        // code[1][0] is the stat to change, or array of stats
        // code[1][1] is the amount, or an array defining a calculation
        let which = Array.isArray(code[1][0]) ? code[1][0] : [code[1][0]];
        for(let s of which)
        {
          if(Array.isArray(code[1][1]))
            console.log("func to handle:", code[1][1]);
          else
            stats[s] = (stats[s] ?? 0) + code[1][1];
        }
      }
      else
      {
        console.log("Unhandled set bonus code:", code);
      }
    }
    return {sets, bonuses, codes, stats, substats}
  }
  
  getRelatedItems(buildId="default")
  {
    let related = {
      bestArtifacts: {
        flower: this.list.viewer.lists.artifacts.items("flower").sort(Character.sortArtifacts.bind(this,buildId)),
        plume: this.list.viewer.lists.artifacts.items("plume").sort(Character.sortArtifacts.bind(this,buildId)),
        sands: this.list.viewer.lists.artifacts.items("sands").sort(Character.sortArtifacts.bind(this,buildId)),
        goblet: this.list.viewer.lists.artifacts.items("goblet").sort(Character.sortArtifacts.bind(this,buildId)),
        circlet: this.list.viewer.lists.artifacts.items("circlet").sort(Character.sortArtifacts.bind(this,buildId)),
      },
      artifactFields: this.list.viewer.lists.artifacts.display.fields,
      artifactSets: GenshinArtifactData,
      buildData: this.getBuild(buildId),
      buildName: buildId,
    };
    return related;
  }
  
  getMaxArtifactScore(slot, buildId, level=20)
  {
    if(!slot)
      return null;
    if(!this.maxScores[slot+(buildId??'')+'#'+level])
    {
      let levelFactor = level / 20 * 6.8 + 1.2;
      let builds = buildId ? [this.getBuild(buildId)] : this.getBuilds();
      let gigaMax = 0;
      for(let b in builds)
      {
        let bestSubstats = [];
        let build = builds[b];
        for(let s in build.artifactSubstats)
        {
          let value = Math.max(build.artifactSubstats[s]??0, Artifact.substatMins[s]);
          let sort = false;
          // If bestSubstats isn't full, just add a new element.
          if(bestSubstats.length < 5)
          {
            bestSubstats.push({key:s, value:value});
            if(bestSubstats.length == 5)
              sort = true;
          }
          // If bestSubstats is full, overwrite the lowest value element if this one is higher.
          else
          {
            for(let stat in bestSubstats)
            {
              if(bestSubstats[stat].value < value)
              {
                bestSubstats[stat] = {key:s, value:value};
                sort = true;
                break;
              }
            }
          }
          // If a change was made and bestSubstats is full, make sure it's sorted for the next one.
          if(sort)
            bestSubstats.sort((a,b) => a.value-b.value);
        }
        bestSubstats.sort((a,b) => b.value-a.value);
        
        let buildSlot;
        if(slot == "flower")
          buildSlot = {hp:0};
        else if(slot == "plume")
          buildSlot = {atk:0};
        else
          buildSlot = build[slot+'Stat'] ?? {'':0};
        let max = 0;
        for(let s in buildSlot)
        {
          let top4 = bestSubstats.filter(item => item.key != s).slice(0,4);
          let value = buildSlot[s] * levelFactor + top4.reduce((carry,item) => carry+item.value, (top4[0]?.value??0)*5);
          if(value > max)
            max = value;
        }
        this.maxScores[slot+b+'#'+level] = max;
        if(max > gigaMax)
          gigaMax = max;
      }
      this.maxScores[slot+(buildId??'')+'#'+level] = gigaMax;
    }
    return this.maxScores[slot+(buildId??'')+'#'+level];
  }
  
  getArtifactSetPrio(setKey, build)
  {
    return this.getBuild(build).artifactSets?.[setKey] ? 1 : 0;
  }
  
  addPopupEventHandlers(popupBody)
  {
    console.log(this.getSetBonus());
    let buildId = "default";
    
    let artifactSets = popupBody.querySelector("#bestArtifactSets");
    if(artifactSets && !artifactSets.onchange)
      artifactSets.onchange = event => {
        let build = this.getBuild(buildId);
        let sets = [];
        Array.from(artifactSets.selectedOptions).forEach(optionElement => {
          sets.push(optionElement.value);
          if(!build.artifactSets[optionElement.value])
            build.artifactSets[optionElement.value] = {};
        });
        let previousSets = Object.keys(build.artifactSets);
        previousSets.forEach(setKey => {
          if(sets.indexOf(setKey) == -1)
            delete build.artifactSets[setKey];
        });
        for(let slot of ["flower","plume","sands","goblet","circlet"])
          Renderer.renderList2(`artifacts/${slot}`, {
            items: this.list.viewer.lists.artifacts.items(slot).sort(Character.sortArtifacts.bind(this,buildId)),
            fields: this.list.viewer.lists.artifacts.display.fields,
            parent: this,
            force: true,
          });
        this.update("buildData", {}, "notify");
        this.list.viewer.store();
      };
    
    let statSliders = popupBody.querySelectorAll(".artifact-stat-slider");
    for(let sliderDiv of statSliders)
    {
      let name = sliderDiv.attributes.getNamedItem('name')?.value;
      let categories = name.split("_");
      let label = sliderDiv.querySelector("*[name='value']");
      let slider = sliderDiv.querySelector("input");
      let stat = slider.attributes.getNamedItem('name')?.value;
      slider.onchange = event => {
        this.getBuild(categories[0])[categories[1]][stat] = parseFloat(slider.value);
        label.innerHTML = slider.value;
        this.maxScores = {};
        
        if(categories[1] == "artifactSubstats")
        {
          this.list.viewer.lists.artifacts.items('flower').forEach(item => item.storedStats.characters[this.key] = null);
          Renderer.renderList2(`artifacts/flower`, {
            items: this.list.viewer.lists.artifacts.items('flower').sort(Character.sortArtifacts.bind(this,buildId)),
            fields: this.list.viewer.lists.artifacts.display.fields,
            parent: this,
            force: true,
          });
        }
        if(categories[1] == "artifactSubstats")
        {
          this.list.viewer.lists.artifacts.items('plume').forEach(item => item.storedStats.characters[this.key] = null);
          Renderer.renderList2(`artifacts/plume`, {
            items: this.list.viewer.lists.artifacts.items('plume').sort(Character.sortArtifacts.bind(this,buildId)),
            fields: this.list.viewer.lists.artifacts.display.fields,
            parent: this,
            force: true,
          });
        }
        if(categories[1] == "artifactSubstats" || categories[1] == "sandsStat")
        {
          this.list.viewer.lists.artifacts.items('sands').forEach(item => item.storedStats.characters[this.key] = null);
          Renderer.renderList2(`artifacts/sands`, {
            items: this.list.viewer.lists.artifacts.items('sands').sort(Character.sortArtifacts.bind(this,buildId)),
            fields: this.list.viewer.lists.artifacts.display.fields,
            parent: this,
            force: true,
          });
        }
        if(categories[1] == "artifactSubstats" || categories[1] == "gobletStat")
        {
          this.list.viewer.lists.artifacts.items('goblet').forEach(item => item.storedStats.characters[this.key] = null);
          Renderer.renderList2(`artifacts/goblet`, {
            items: this.list.viewer.lists.artifacts.items('goblet').sort(Character.sortArtifacts.bind(this,buildId)),
            fields: this.list.viewer.lists.artifacts.display.fields,
            parent: this,
            force: true,
          });
        }
        if(categories[1] == "artifactSubstats" || categories[1] == "circletStat")
        {
          this.list.viewer.lists.artifacts.items('circlet').forEach(item => item.storedStats.characters[this.key] = null);
          Renderer.renderList2(`artifacts/circlet`, {
            items: this.list.viewer.lists.artifacts.items('circlet').sort(Character.sortArtifacts.bind(this,buildId)),
            fields: this.list.viewer.lists.artifacts.display.fields,
            parent: this,
            force: true,
          });
        }
        this.update("buildData", {}, "notify");
        this.list.viewer.store();
      };
    }
    
    let equipButtons = popupBody.querySelectorAll(".equip-artifact");
    for(let btn of equipButtons)
    {
      // Determine the item for the button.
      let itemElement = btn.parentElement;
      while(itemElement && !itemElement.classList.contains("list-item"))
        itemElement = itemElement.parentElement;
      if(!itemElement)
      {
        console.error(`Equip button element has no ancestor with the 'list-item' class.`);
        return false;
      }
      let itemName = itemElement.attributes.getNamedItem('name')?.value;
      
      // Verify that item and field are found.
      let item = this.list.viewer.lists.artifacts.get(itemName);
      if(!item)
      {
        console.error(`Unable to determine '${itemName}' item of this button element to equip.`);
        return false;
      }
      btn.onclick = event => {
        Renderer.renderList2(`artifacts/${item.slotKey}`, {
          items: item.list.items(item.slotKey).sort(Character.sortArtifacts.bind(this,buildId)),
          fields: item.list.display.fields,
          parent: this,
          force: true,
        });
        item.update("location", this.key);
        this.list.viewer.store();
      };
    }
  }
}
