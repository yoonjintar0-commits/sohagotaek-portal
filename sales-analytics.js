(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.SohaSalesAnalytics = api;
})(globalThis, function () {
  function temperatureBand(temperature) {
    const min = Math.floor(temperature), max = min + 1;
    return {min,max,label:min+'–'+max+'℃'};
  }
  function integerHours(value) {
    return Number.isFinite(Number(value)) ? Math.floor(Math.max(0, Number(value))) : 0;
  }
  function salesDays(rows, through) {
    const days = new Map();
    for (const row of rows) {
      if (row.branch === 'hq' || row.saleMissing || !Number.isFinite(row.sale) || through && row.date > through) continue;
      if (!days.has(row.date)) days.set(row.date, {date:row.date,sale:0,rows:[]});
      const day = days.get(row.date);
      day.sale += row.sale;
      day.rows.push(row);
    }
    return [...days.values()].sort((a,b)=>a.date.localeCompare(b.date));
  }
  function summary(days) {
    const total = days.reduce((sum,day)=>sum+day.sale,0);
    return {days,n:days.length,total,mean:days.length?total/days.length:null};
  }
  function holidayComparison(days, isHoliday) {
    const weekday = summary(days.filter(day=>!isHoliday(day.date)));
    const holiday = summary(days.filter(day=>isHoliday(day.date)));
    return {weekday,holiday,ratio:weekday.mean>0&&holiday.mean!==null?holiday.mean/weekday.mean*100:null};
  }
  function temperatureGroups(rows, cache, through) {
    const groups = new Map();
    const days = salesDays(rows,through);
    let missing = 0;
    for (const day of days) {
      const branches = [...new Set(day.rows.map(row=>row.branch))];
      const temperatures = branches.map(branch=>cache[branch+'|'+day.date]?.meanTemperature);
      if (!temperatures.every(Number.isFinite)) { missing++; continue; }
      const temperature = temperatures.reduce((sum,value)=>sum+value,0)/temperatures.length;
      const band = temperatureBand(temperature);
      if (!groups.has(band.min)) groups.set(band.min, {...band,days:[]});
      groups.get(band.min).days.push({...day,temperature});
    }
    return {groups:[...groups.values()].sort((a,b)=>a.min-b.min).map((group,index)=>({...group,index,...summary(group.days)})),missing,totalDays:days.length};
  }
  return {integerHours,salesDays,holidayComparison,temperatureGroups,temperatureBand};
});
