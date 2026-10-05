(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.SohaSalesAnalytics = api;
})(globalThis, function () {
  const bands = [
    {min:-Infinity,max:0,label:'0℃ 미만'},
    {min:0,max:5,label:'0–5℃'},
    {min:5,max:10,label:'5–10℃'},
    {min:10,max:15,label:'10–15℃'},
    {min:15,max:20,label:'15–20℃'},
    {min:20,max:25,label:'20–25℃'},
    {min:25,max:30,label:'25–30℃'},
    {min:30,max:Infinity,label:'30℃ 이상'}
  ];
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
    const groups = bands.map((band,index)=>({...band,index,days:[]}));
    const days = salesDays(rows,through);
    let missing = 0;
    for (const day of days) {
      const branches = [...new Set(day.rows.map(row=>row.branch))];
      const temperatures = branches.map(branch=>cache[branch+'|'+day.date]?.meanTemperature);
      if (!temperatures.every(Number.isFinite)) { missing++; continue; }
      const temperature = temperatures.reduce((sum,value)=>sum+value,0)/temperatures.length;
      groups.find(group=>temperature>=group.min&&temperature<group.max).days.push({...day,temperature});
    }
    return {groups:groups.map(group=>({...group,...summary(group.days)})),missing,totalDays:days.length};
  }
  return {integerHours,salesDays,holidayComparison,temperatureGroups,bands};
});
