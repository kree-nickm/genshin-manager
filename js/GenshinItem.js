import UIItem from "./UIItem.js";

export default class GenshinItem extends UIItem {
  goodProperties = [];
  
  fromGOOD(goodData)
  {
    if(typeof(goodData) == "object")
    {
      for(let key in goodData)
      {
        this.#fromGOODHelper(goodData, key, [key]);
        if(this.goodProperties.indexOf(key) == -1)
          this.goodProperties.push(key);
      }
      return this.afterLoad();
    }
    else
    {
      console.error("GenshinItem.fromGOOD(1) only accepts an object as an argument.", goodData);
      return false;
    }
  }
  
  #fromGOODHelper(goodData, key, keys)
  {
    if(Array.isArray(goodData[key]))
    {
      this.update(keys, goodData[key], "replace");
    }
    else if(typeof(goodData[key]) == "object")
    {
      for(let subkey in goodData[key])
      {
        this.#fromGOODHelper(goodData[key], subkey, keys.concat([subkey]));
      }
    }
    else
    {
      this.update(keys, goodData[key]);
    }
  }
  
  toGOOD()
  {
    let result = {};
    for(let prop of this.goodProperties)
      result[prop] = this[prop];
    return result;
  }
  
  toJSON()
  {
    let result = super.toJSON();
    for(let prop of this.goodProperties)
      result[prop] = this[prop];
    return result;
  }
}
