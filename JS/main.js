const LSK = 'keys'; //Local Storage Key
const REFRESH_DATA_RATE = 1000; // 1s
const REFRESH_DEFAULT_LIMIT = 2;

var DOUBLECLICK_DELAY = 300; //300 Milliseconds, 0.3 seconds
let useCurrentTime = true; //Max time is current time, only valid if date is same
let refreshInterval = null;
let currentTimeInterval;
let lockCurrentTime = false; //Slider val will go with current time
let changeDateVariable = false;
let incomingNewData = true;
let currentNewData = true;
let currentDay = false;

$(document).ready(function() {
  if (isAPIAvailable()) {
    $('#files').bind('change', handleFileSelect);
  }
});

switch (window.location.protocol) {
  case 'http:':
  case 'https:':
    // let keys = "";
    // let xmlHttp = new XMLHttpRequest();
    // xmlHttp.onreadystatechange = function(){
    //   if(xmlHttp.status == 200 && xmlHttp.readyState == 4){
    //     keys = xmlHttp.responseText;
    //     $('#surveyJSDBid').val(keys);
    //     start();
    //   }
    // };
    // xmlHttp.open("GET", "JS/surveyJSDBinfo.txt", true)
    // xmlHttp.send()
    //break;
  case 'file:':
    console.log('over file');
    break;
  default:
  //some other protocol
}

function isAPIAvailable() {
  // Check for the various File API support.
  if (window.File && window.FileReader && window.FileList && window.Blob) {
    // Great success! All the File APIs are supported.
    return true;
  } else {
    // source: File API availability - http://caniuse.com/#feat=fileapi
    // source: <output> availability - http://html5doctor.com/the-output-element/
    document.writeln(
      'The HTML5 APIs used in this form are only available in the following browsers:<br />'
    );
    // 6.0 File API & 13.0 <output>
    document.writeln(' - Google Chrome: 13.0 or later<br />');
    // 3.6 File API & 6.0 <output>
    document.writeln(' - Mozilla Firefox: 6.0 or later<br />');
    // 10.0 File API & 10.0 <output>
    document.writeln(
      ' - Internet Explorer: Not supported (partial support expected in 10.0)<br />'
    );
    // ? File API & 5.1 <output>
    document.writeln(' - Safari: Not supported<br />');
    // ? File API & 9.2 <output>
    document.writeln(' - Opera: Not supported');
    return false;
  }
}

function handleFileSelect(evt) {
  var files = evt.target.files; // FileList object
  var file = files[0];

  var reader = new FileReader();
  reader.readAsText(file);

  reader.onload = function(event) {
    var csv = event.target.result;
    var data = $.csv.toArrays(csv);
    var index = 0;

    for (var row in data) {
      for (var item in data[row]) {
        if (index == 0) {
          $('#surveyJSDBid').val(data[row][item]);
          index = index + 1;
        }
      }
    }
  };
  reader.onerror = function() {
    alert('Unable to read ' + file.fileName);
  };
}

var dbID = $('#surveyJSDBid').val();
let slider = document.getElementById('myRange');

// Get the <span> element that closes the modal
var span = document.getElementsByClassName('close')[0];

// Get the modal
var modal = document.getElementById('myModal');

// When the user clicks on <span> (x), close the modal
span.onclick = () => {
  modal.style.display = 'none';
  chartInfoDisplay = false;
};

function useMe(evt) {
  $('#surveyJSDBid').val((_dbid = $(evt).data().dbid));
  start();
}
let _dbid;

$('#clearID').click(() => {
  window.localStorage.removeItem(LSK);
  loadIDHolder();
});

$('#startButton').click(() => start());

$('#clearButton').click(() => {
  $('#surveyJSDBid').val('');
});

let rb = 'Stop';
$('#toggleStopStartButton').click(() => {
  if (rb == 'Stop') {
    clearInterval(refreshInterval);
    refreshInterval = null;
    rb = 'Start';
    $('#runningtext').text('Has Stopped');
  } else {
    runRefeshInterval();
    rb = 'Stop';
    $('#runningtext').text('Is Running');
  }
  $('#toggleStopStartButton').text(rb);
});

slider.oninput = function() {
    let endDate = dt.secondsToDate(this.value);
    $('.sliderOutput').val(dt.dateToInputTimeString(endDate));
    data.dataNewTime(endDate);
};

function inputTimeChange(inputId){
  if (inputId == "inputMin"){
    let startValue = $('.startTime').val();
    let earliestTime = new Date(Math.min.apply(null,data.dayData.map(function(d){return d.HappendAt})));
    let indivTime = (startValue.split(":"))
    earliestTime.setHours(indivTime[0]);
    earliestTime.setMinutes(indivTime[1]);
    $(slider).attr('min', dt.dateToSeconds(earliestTime))
    $(slider).val(dt.dateToSeconds(earliestTime))
    data.dataNewTime(earliestTime);
  }
  else{
    let latestTime = new Date(Math.max.apply(null,data.dayData.map(function(d){return d.HappendAt})));
    let sliderOutput = $('.sliderOutput').val();
    let indivTime = sliderOutput.split(":");
    latestTime.setHours(indivTime[0]);
    latestTime.setMinutes(indivTime[1]);
    $(slider).attr('max', dt.dateToSeconds(latestTime));
    $(slider).val(dt.dateToSeconds(latestTime))
    data.dataNewTime(latestTime);
  }
};

function setTimeNow(buttonId){
  currentDay? now = new Date() : now = new Date(Math.max.apply(null,data.dayData.map(function(d){return d.HappendAt})));
  let latestTime = new Date(Math.max.apply(null,data.dayData.map(function(d){return d.HappendAt})));
  let earliestTime = new Date(Math.min.apply(null,data.dayData.map(function(d){return d.HappendAt})));
  if (buttonId == "startNow") {
    $('.startTime').val(dt.dateToInputTimeString(new Date()));
    $(slider).attr('min', dt.dateToSeconds(new Date()));
  }
  else if (buttonId == "endNow"){
    $('.sliderOutput').val(dt.dateToInputTimeString(new Date()));
    $(slider).attr('max', dt.dateToSeconds(new Date()));
    data.holdingMode = null
    clearInterval(currentTimeInterval);
    data.currentInterval();
  }
  else if (buttonId == "startEarliest"){
    $('.startTime').val(dt.dateToInputTimeString(earliestTime))
    $(slider).attr('min', dt.dateToSeconds(earliestTime));
    data.dataNewTime(earliestTime)
  }
  else{
    $('.sliderOutput').val(dt.dateToInputTimeString(latestTime))
    $(slider).attr('max', dt.dateToSeconds(latestTime));
    data.dataNewTime(latestTime)
  }
}

function loadIDHolder() {
  const keys = JSON.parse(window.localStorage.getItem(LSK));
  $('#firstKeyRow')
    .nextAll()
    .remove();
  if (keys) {
    $('#keyRowList').show();
    let appendingHTML = '';
    keys.forEach(({ dbID, name }) => {
      appendingHTML += `
        <hr>
        <div class="row">
            <div class="col-9">
                <p class="wordBreak">${name}</p>
            </div>
            <div class="col-3 nopadding" style="display: flex">
                <button class="btn btn-success btn-sm useMe" onclick="useMe(this)"data-dbID="${dbID}" style="margin: auto;">Use</button>
            </div>
        </div>
    `;
    });
    $('#firstKeyRow').after(appendingHTML);
  } else $('#keyRowList').hide();
}
loadIDHolder();

function toggleCurrent() {
  if (useCurrentTime) {
    useCurrentTime = false;
    $('#currentB').html('False');
    clearInterval(currentTimeInterval);
    currentTimeInterval = null;
    $('#holding').hide();
    data.setUp();
  } else {
    useCurrentTime = true;
    $('#currentB').html('True');
    if (!currentTimeInterval) data.setUp();
  }
}

//////////////////////////////////////////////////Start
function start() {
  let name = $('#name').val();
  if (_dbid) {
    dbID = _dbid;
  } else {
    if (!name) {
      alert('Please Enter Name');
      $('#name').focus();
      return;
    }
    dbID = $('#surveyJSDBid').val();
  }
  if (dbID) {
    $('#surveyJSDBid, #startButton').prop(
      'disabled',
      true
    );
    $('#firstLoading').show();
    data
      .getData(dbID)
      .then(data => {
        let ka = JSON.parse(window.localStorage.getItem(LSK));
        if (!ka) ka = [];
        if (!ka.find(k => k.dbID == dbID)) {
          ka.push({ dbID, name });
          window.localStorage.setItem(LSK, JSON.stringify(ka));
          loadIDHolder();
        }
        if (data.length == 0) alert('No data');
        else mainPageProcessing();
      })
      .catch(() => alert('Invalid dbID'))
      .finally(() => {
        $('#surveyJSDBid, #startButton').prop(
          'disabled',
          false
        );
        $('#firstLoading').hide();
      });
  } else alert('Empty dbID');
}

function mainPageProcessing() {
  $('.firstPage').hide();
  $('.runningPage').show();
  $('.chartHeight').show();
  runningRefresh(); //First run
  runRefeshInterval();
}

function runRefeshInterval() {
  let refreshLimit = {
    limit: REFRESH_DEFAULT_LIMIT,
    restart: () => (this.limit = REFRESH_DEFAULT_LIMIT)
  };
  refreshInterval = setInterval(() => {
    console.log('Refreshing');
    let oldDataLength = [...data.ajaxData].length;
    data
      .getData(dbID)
      .then(({ length }) => {
        refreshLimit.restart();
        if (oldDataLength != length) {
          incomingNewData = true;
          currentNewData = true;
          runningRefresh();
        } //There's new Data
      })
      .catch(() => refreshLimit.limit--);
    if (refreshLimit == 0) {
      clearInterval(refreshInterval);
      refreshInterval = null;
      alert('Refesh limit hit, error with connection');
      $('.firstPage').show();
    }
  }, REFRESH_DATA_RATE);
}

//Main function for running
function runningRefresh() {
  console.log('Refreshing page data');
  data.mainSort();
}

function changeDate(evt) {
  $(slider).val(50);
  changeDateVariable = true;
  // sChart = true;
  // $('.chartHeight').show();
  // $('#showChartBtn').text('Show Chart');
  let currLes = $('#lessonSelection').val();
  data.setDate(new Date(evt.options[evt.selectedIndex].text), currLes);
}

$('#lessonSelection').attr('disabled', true)

const data = new (class {
  dbRootURL = 'https://surveyjs.io/api/MySurveys/getSurveyPublicResults/';
  ajaxData = []; //All Data
  sortedData = [];
  dayData = []; //Selected Date Data
  dayEndTime; // Day EndTime
  resolveData = []; //Resolved Data
  nameArray = []; //Name Data, Jason's View
  qnLabelArray = []; //QnLabel Data for Charts
  chartInfos = []; //Chart info after clicking bar chart
  uniqueNames = []; //Keep track of every student who entered quiz
  studentsNotAttempted = []; //Keep track of studnents who have yet to attempt per question
  allLessons=[]; //All lesson titles

  getData(dbID) {
    return new Promise((resolve, reject) => {
      $.ajax({
        type: 'GET',
        url: `https://surveyjs.io/api/MySurveys/getSurveyPublicResults/${dbID}`,
        dataType: 'json'
      })
        .done(value => resolve((this.ajaxData = value.Data)))
        .fail((jqXHR, textStatus) => reject(new Error(textStatus)));
    });
  }
  mainSort() {
    changeDateVariable = true;
    
    //let d = (this.sortedData = this.ajaxData.concat());
	
	  this.sortedData = this.ajaxData.concat();
	  this.sortedData.forEach(element => {
		  element.Title = element.Title.trim();
	  })
	  let d = this.sortedData;
    
    d.map(
      value =>
        (value.HappendAt = new Date(
          new Date(value.HappendAt).getTime() + 8 * 3600000
        ))
    );
    d.sort((a, b) => new Date(b.HappendAt) - new Date(a.HappendAt));
    let uniqueDates = [
      ...new Set(d.map(({ HappendAt }) => dt.dateToDateString(HappendAt)))
    ];
    //set lesson selector
    let lesHolder = $('#lessonSelection').val();
    let uniqueLessons =[...new Set(d.map(l => `<option>${l.Title}</option>`))];
    let collator = new Intl.Collator(undefined, {sensitivity: 'base'});
    uniqueLessons.forEach(element=>{
      if (element.includes('undefined')){
        element = element.replace("undefined", "No Lesson Assigned");
      }
      if(this.allLessons.includes(element)==false) this.allLessons.push(element)
    })
    $('#lessonSelection').html(this.allLessons.sort(collator.compare));
    //set date selector
    let holder = $('#dateSelection').val();
    $('#dateSelection').html(() => {
      let newArray = uniqueDates
        .map(d => (d != todayDate ? `<option>${d}</option>` : undefined))
        .filter(a => a);
      newArray.unshift(`<option>${todayDate} (Today)</option>`);
      return newArray.reduce((a, b) => a + b);
    });
    if (holder) {
      $('#dateSelection').val(holder);
      if (lesHolder){
        $('#lessonSelection').val(lesHolder);
        this.setDate(new Date(holder), lesHolder);
      }
      else{
        this.setDate(new Date(holder), $('#lessonSelection').val())
      }
    } 
    else {
      if (lesHolder){
        $('#lessonSelection').val(lesHolder);
        this.setDate(new Date(), lesHolder);
      }
      else{
        this.setDate(new Date(), $('#lessonSelection').val())
      }
    }
  }

  //Activate when change date
  setDate(date, lesson) {
    this.dayData = this.arrayToDate(this.sortedData, date);
    console.log(this.dayData)
    this.dayData = this.arrayByLesson(this.dayData, lesson);
   
    //If selected date doesn't have data, only applicable for today's date
    if (this.dayData.length == 0) {
      console.log('This date no data');
      $('.sliderDiv').hide();
      $('#studentsProgress').html('<p>No Data for this date</p>');
      $('.chartHeight').hide();
      $('#buttons').hide();
      $('#current').hide();
      if (!refreshInterval && !incomingNewData) runRefeshInterval();
      return;
    } else {
      $('.sliderDiv').show();
      $('#buttons').show();
      $('#current').show();
      if (sChart) {
        $('.chartHeight').show();
      } else {
        $('.chartHeight').hide();
      }
    }

    //Get latest time
    this.dayEndTime = this.dayData[0].HappendAt;
    if (dt.dateToDateString(date) == todayDate) {
      useCurrentTime = $('#currentB').text() == 'False' ? false : true;
      currentDay = true;
      $('#current').show();
      $('#btnStart').html('Set Now')
      $('#btnStart').prop("value", "startNow")
      $('#btnEnd').html('Set Now')
      $('#btnEnd').prop("value", "endNow")
      if (!refreshInterval && !incomingNewData) runRefeshInterval();
    } else {
      useCurrentTime = false;
      currentDay = false;
      clearInterval(refreshInterval);
      refreshInterval = null;
      $('#current').hide();
      $('#btnStart').html('Set Earliest')
      $('#btnStart').prop("value", "startEarliest")
      $('#btnEnd').html('Set Latest')
      $('#btnEnd').prop("value", "endLatest")
    }
    incomingNewData = false;

    //Add resolved data
    let cDate =
      currentDay || !$('#dateSelection').val()
        ? dt.dateToDateString(new Date())
        : $('#dateSelection').val();
    let resolvedThisDateData = resolvedData.filter(s => s.date == cDate && s.title==lesson);
    console.log(resolvedThisDateData)
    if (resolvedThisDateData) {
      for (let i = 0; i < resolvedThisDateData.length; i++) {
        const { Answer, Code, HappendAt, Name, QnLabel, Title } = resolvedThisDateData[
          i
        ].data;
        let rd = {
          Code,
          QnLabel,
          Name,
          Answer,
          HappendAt,
          Title
        };
        this.dayData.map(data => {
          if (data.Name == rd.Name && data.Answer == rd.Answer && data.Code==rd.Code && data.Title == rd.Title && data.QnLabel == rd.QnLabel)
          data.resolved = resolvedThisDateData[i].data.resolved
          else data
        });
      }
    }
    this.setQn0();
    this.setUp();
  }

  setLesson(evt){
    console.log("lesson changed");
    let date = $('#dateSelection option:selected').val();
    if (date.includes("(Today)")) date = new Date(date.replace("(Today)", "").trim());
    else date = new Date(date)
    let currLes = (evt.options[evt.selectedIndex].text);
    this.setDate(date, currLes)
    slider.value = slider.max
    this.runChartView();
    this.refreshJasonView();
  }

  //Activate with useCurrentTime button
  setUp() {
    const earliestTime = new Date(Math.min.apply(null,this.dayData.map(function(d){return d.HappendAt})))//this.dayData[this.dayData.length - 2].HappendAt;
    const minValue = dt.dateToSeconds(earliestTime);
    const maxValue = dt.dateToSeconds(this.dayEndTime);
    const maxString = dt.dateToInputTimeString(this.dayEndTime);
    $(slider).attr('min', minValue);

    $('.startTime').val(dt.dateToInputTimeString(earliestTime));
    //If there is a change of date/html is not set
    if ($('.sliderOutput').val() == '' || changeDateVariable)
     $('.sliderOutput').val(maxString);

    //Check if use current time
    if (useCurrentTime) {
      if (!currentTimeInterval) this.runCurrentInterval();
    } else {
      clearInterval(currentTimeInterval);
      currentTimeInterval = null;
      $('#now').hide();
      $(slider).attr('max', maxValue);
      if (changeDateVariable) {
        if (currentDay)
          return this.dataNewTime(dt.secondsToDate($(slider).val()));
        changeDateVariable = false;
        $('.sliderOutput').val(maxString);
        $(slider).val(maxValue);
        this.dataNewTime(this.dayEndTime);
      } else this.dataNewTime(dt.secondsToDate($(slider).val()));
    }
  }
  holdingMode = null;
  timeInterval = 0;
  runCurrentInterval() {
    $('#now').show();
    $('#holding').show();
    this.holdingMode = null;
    this.timeInterval = 0;
    this.currentInterval();
    currentNewData = true;
  }
  currentInterval() {
    currentTimeInterval = setInterval(() => {
      const currentTime = new Date();
      const currentSeconds = dt.dateToSeconds(currentTime);
      slider.setAttribute('max', currentSeconds);
      $('#now').html(dt.dateToTimeString(currentTime));
      if (this.holdingMode == null) {
        clearInterval(currentTimeInterval);
        this.timeInterval = 2000;
        this.currentInterval();
      }
      if (
        parseInt($(slider).val()) + 3 >= currentSeconds ||
        this.holdingMode == null
      ) {
        this.holdingMode = true;
        $('#holding').text('(Lock)');
        $(slider).val(currentSeconds);
        $('.sliderOutput').val(dt.dateToInputTimeString(currentTime));
        if (currentNewData) this.dataNewTime(currentTime);
      } else {
        $('#holding').text('(Free)');
        this.holdingMode = false;
        if (currentNewData)
          this.dataNewTime(dt.secondsToDate(parseInt($(slider).val())));
      }
      currentNewData = false;
    }, this.timeInterval);
  }
  dateHolder;
  dataNewTime(date) {
    this.dateHolder = date = new Date(date.getTime() + 1000); //Hacks
    this.refreshJasonView();
    if (sChart) {
      this.runChartView();
      if (chartInfoDisplay) refreshChartInfo();
    }
  }
  runChartView() {
    console.log('run chart');
    this.qnLabelArray = this.arrayByQnLabel(this.dayData, this.dateHolder);
    this.studentsNotAttempted = this.arrayByQnNotAnswered(this.qnLabelArray, this.uniqueNames);
    chartView(this.qnLabelArray);
  }
  refreshJasonView() {
    console.log("refresh json view")
    this.qnLabelArray = this.arrayByQnLabel(this.dayData, this.dateHolder);
    this.nameArray = this.arrayByNames(this.dayData, this.dateHolder);
    if (studentView) {
      jasonView(this.nameArray);
    } else {
      $('#studentsProgress').html('');
    }
  }
  setQn0(){
  let collator = new Intl.Collator(undefined, {sensitivity: 'base'});
    this.uniqueNames = [...new Set(this.dayData.map(a => a.Name))].sort(collator.compare);
    for (let i = 0; i < this.uniqueNames.length; i++){
      let findAllByName = this.dayData.filter(a => a.Name==this.uniqueNames[i]);
      let containsqn0 = findAllByName.some(a=>a["QnLabel"]==="0");
      if (!containsqn0){
        let newdata = {
          Name:this.uniqueNames[i],
          QnLabel: "0",
          HappendAt: new Date(Math.min.apply(null,
            findAllByName.map(function(findAllByName){return findAllByName.HappendAt}))),
        };
        this.dayData.push(newdata);
      };
    };
  }
  arrayToDate(a, date) {
    return a.filter(
      ({ HappendAt }) =>
        HappendAt.getFullYear() == date.getFullYear() &&
        HappendAt.getMonth() == date.getMonth() &&
        HappendAt.getDate() == date.getDate()
    );
  }
  arrayByNames(a, time = new Date(), sortNameBy) {
    let newArray = [...new Set(a.map(({ Name }) => Name))]
      .map(name => {
        let c = a.filter(
          ({ Name, HappendAt }) => name == Name && HappendAt <= time
        );
        let userQnLabels = [...new Set(c.map(({ QnLabel }) => QnLabel))].map(
          QnLabel => c.find(s => s.QnLabel == QnLabel)
        );
        // let progress = this.arraySortString(userQnLabels, "QnLabel");
        let progress = userQnLabels;
        return {
          name,
          progress,
          latest: Math.max(...userQnLabels.map(({ HappendAt }) => HappendAt))
        };
      })
      .filter(({ progress }) => progress.length != 0);
      if (!sortNameBy) return this.arraySortString(newArray, 'latest', 'asc');
    return this.arraySortString(newArray, 'name', sortNameBy);
  }

  arrayByQnLabel(a, time = new Date()) {
    return this.arraySortQnLabel(
      [...new Set(a.map(({ QnLabel }) => QnLabel))].map(QnLabel => {
        let c = a.filter(v => QnLabel == v.QnLabel && v.HappendAt <= time);
        return {
          QnLabel,
          data: [...new Set(c.map(({ Name }) => Name))].map(Name =>
            c.find(s => s.Name == Name)
          ),
          type:!c.find(s => s.QnLabel !=0)
            ? 'CP' //Checkpoint (Question 0)
            : !c.find(s => s.Code || s.Answer)
            ? 'MS' //Milestone
            : !c.find(s => s.Code)
            ? 'FR' //Free Response
            : !c.find(s => s.Answer)
            ? 'TL' //Traffic Light
            : ''
        };
      }),
    );
  }
  arrayByQnNotAnswered(a,b){
    let newarray = [...new Set(a.map(({ QnLabel }) => QnLabel))]
    .map(QnLabel => {
      let notCompleted = []
      let c = a.filter(x=> x.QnLabel==QnLabel).map(y=>y.data)
      let completed=c[0].map(function(x){return x.Name;});
      b.forEach(function(i){
        if (completed.length!=b.length && completed.includes(i)==false){
          notCompleted.push(i)
        }
        else return;
      });
      return{
        QnLabel,
        Names: notCompleted
      }
    });
    if (newarray.length!=0)
    newarray.find(x=> x.QnLabel==0).Names = this.uniqueNames.sort();
    return newarray
  }
  arrayByLesson(a, name){
    if (name!='No Lesson Assigned') return a.filter(x=> x.Title == name);
    else return a.filter(x=> x.Title == undefined)
  }
  arraySortString(array, name, ascdesc = 'desc') {
    return array.sort((a, b) => {
      return ascdesc == 'desc'
        ? a[name] < b[name]
          ? -1
          : b[name] < a[name]
          ? 1
          : 0
        : ascdesc == 'asc'
        ? a[name] > b[name]
          ? -1
          : b[name] > a[name]
          ? 1
          : 0
        : new Error('Unable to sort');
    });
  }
  arraySortQnLabel(array){
    let collator = new Intl.Collator(undefined, {numeric: true});
    let sortedArray = array.map(a => a.QnLabel);
    sortedArray.sort(collator.compare);
    for (let i=0; i<array.length; i++){
      if (array[i].QnLabel != sortedArray[i]){
        let index = array.findIndex(x=>x.QnLabel==sortedArray[i]);
        [array[index], array[i]] = [array[i], array[index]];
      }
      else continue;
    }
    return array;
  };
})();

const dt = new (class {
  dateToSeconds(date = new Date()) {
    return date.getSeconds() + date.getMinutes() * 60 + date.getHours() * 3600;
  }
  dateToTimeString(date) {
    return `${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}`;
  }
  dateToDateString(date) {
    return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
  }
  dateToInputTimeString(date){
    let hours = date.getHours().toString();
    let minutes = date.getMinutes().toString();
    hours.length < 2 ? hours = '0' + hours : hours;
    minutes.length < 2 ? minutes = '0' + minutes : minutes;
    return `${hours}:${minutes}`
  }
  formatTime(s) {
    let seconds = s % 60;
    let hours = Math.trunc(s / 60 / 60);
    let minutes = (s - hours * 60 * 60 - seconds) / 60;
    return `${hours}:${minutes}:${seconds}`;
  }
  secondsToDate(s) {
    let seconds = s % 60;
    let hours = Math.trunc(s / 60 / 60);
    let minutes = (s - hours * 60 * 60 - seconds) / 60;
    return new Date(
      data.dayEndTime.getFullYear(),
      data.dayEndTime.getMonth(),
      data.dayEndTime.getDate(),
      hours,
      minutes,
      seconds
    );
  }
})();

//Name View
function jasonView(a) {
  $('#studentsProgress').html('');
  if (document.createElement('template').content) {
    a.forEach(({ name, progress }) => {
      var student = document
        .getElementById('studentTemplate')
        .content.cloneNode(true);
      student.querySelector('.studentName').innerHTML = name;
      progress.forEach(d => {
        const { QnLabel, Answer, Code, resolved } = d;
        var cell = document
          .getElementById('cellTemplate')
          .content.cloneNode(true)
          .querySelector('.progressCell');
        cell.innerHTML = QnLabel;
        cell.dataset.name = name;
        cell.dataset.qnLabel = QnLabel;
        cell.dataset.indexHist = data.dayData.findIndex(dd => d == dd);
        var type = data.qnLabelArray.find(qn => qn.QnLabel == QnLabel).type;
        switch (type) {
          case 'TL':
            var cl = `cell${Code}`;
            cell.classList.add(cl);
            if (!resolved && Code != 'codeGreen')
              cell.classList.add(`${cl}Unresolved`);
            break;
          case 'MS':
            cell.classList.add('cellMilestone');
            break;
          case 'FR':
            cell.classList.add('cellFreeResponse');
            break;
          case 'CP':
            cell.classList.add('cellCheckpoint');
            break;
          default:
            if (Code == 'codeGreen') cell.classList.add('cellCorrect');
            else {
              cell.classList.add('cellWrong');
              if (!resolved) cell.classList.add('cellWrongUnresolved');
            }
            break;
        }
        if (Answer) {
          cell.classList.add('feedbackCell');
          cell.dataset.answer = Answer;
          cell.onclick = dynamicFeedback;
        }
        if (!resolved) cell.ondblclick = resolveAlert;
        student.querySelector('.cellBody').appendChild(cell);
      });
      document.getElementById('studentsProgress').appendChild(student);
    });
  } else console.log("Template doesn't work");
}

// let sortNameBy = '';
// function sortName() {
//   if (sortNameBy === '') sortNameBy = 'asc';
//   if (sortNameBy == 'desc') {
//     sortNameBy = 'asc';
//     jasonView(data.arraySortString(data.nameArray, 'name', 'asc'));
//     $('#sortName').text('Sort by Name (Ascending)');
//   } else if (sortNameBy == 'asc') {
//     sortNameBy = 'desc';
//     $('#sortName').text('Sort by Name (Descending)');
//     jasonView(data.arraySortString(data.nameArray, 'name', 'desc'));
//   }
// }

//Student
let studentView = false;
function showStudent() {
  if (studentView) {
    studentView = false;
    $('#studentsProgress').hide();
    $('#showStudentBtn').text('Show Student');
  } else {
    studentView = true;
    $('#studentsProgress').show();
    $('#showStudentBtn').text('Hide Student');
  }
  data.refreshJasonView();
}

//Chart
let sChart = true; //Default turn on
function showChart() {
  if (sChart) {
    sChart = false;
    $('.chartHeight').hide();
    $('#showChartBtn').text('Show Chart');
  } else {
    sChart = true;
    $('.chartHeight').show();
    $('#showChartBtn').text('Hide Chart');
    data.runChartView();
  }
}

const ctx = document.getElementById('chart').getContext('2d');
const myChart = new Chart(ctx, {
  type: 'horizontalBar',
  data: {},
  options: {
    aspectRatio: 1,
    maintainAspectRatio: false,
    animation: {
      duration: 0,
      onComplete: function() {
        var chartInstance = this.chart,
          ctx = chartInstance.ctx;
        ctx.font = Chart.helpers.fontString(
          Chart.defaults.global.defaultFontSize,
          'bold',
          Chart.defaults.global.defaultFontFamily
        );
        ctx.textAlign = 'top';
        ctx.textBaseline = 'top';
        this.data.datasets.forEach(function(dataset, i) {
          var meta = chartInstance.controller.getDatasetMeta(i);
          meta.data.forEach(function(bar, index) {
          var data = dataset.data[index];
            if (data != 0) {
              ctx.fillStyle = 'black';
              ctx.fillText(data, bar._model.x - 20, bar._model.y - 5);
            }
          });
        });
      }
    },
    scales: {
      yAxes: [
        {
          barPercentage: 1,
          stacked: true
        }
      ],
      xAxes: [
        {
          stacked: true,
          ticks: {
            beginAtZero: true,
            stepSize: 1
          }
        }
      ]
    },
    tooltips: {
      enabled: false,
      custom: function(tooltipModel){
        var tooltipEl = document.getElementById('chartjs-tooltip');

        if (!tooltipEl) {
            tooltipEl = document.createElement('div');
            tooltipEl.id = 'chartjs-tooltip';
            tooltipEl.innerHTML = '<table></table>';
            document.body.appendChild(tooltipEl);
        }

        if (tooltipModel.opacity === 0) {
            tooltipEl.style.opacity = 0;
            return;
        }

        // Set caret Position
        tooltipEl.classList.remove('above', 'below', 'no-transform');
        if (tooltipModel.yAlign) {
            tooltipEl.classList.add(tooltipModel.yAlign);
        } else {
            tooltipEl.classList.add('no-transform');
        }

      if (tooltipModel.body) {
          let studentArr = data.studentsNotAttempted.map(({ Names }) => Names);
          let tooltipIndex = tooltipModel.dataPoints[0].index;
          let titleLines = tooltipModel.title;
          let bodyLines = studentArr[tooltipIndex];
          let total = bodyLines.length;
          let counter=0;

          //Set Text
          let innerHtml = '<thead>';
          titleLines.forEach(function(title) {
            (title!=0)
              ?innerHtml += '<tr><th>' + "Qn " + title + " - " + total + " Students Yet to Attempt" + '</th></tr>'
              :innerHtml += '<tr><th>' + total + " Students Currently Present" + '</th></tr>'
            });
          innerHtml += '</thead><tbody>';
          if (bodyLines.length!=0){
            if (bodyLines.length<11 || titleLines[0]==0){
              bodyLines.forEach(function(body) { 
                innerHtml += '<tr><td>' + body + '</td></tr>'
              });
            }
            else{
              for (let i = 0; i < 10; i++){
              innerHtml += '<tr><td>' + bodyLines[i] + '</td></tr>';
              };
              innerHtml += '<tr><td>Etc.</td></tr>';
            }
          }
          else{
            innerHtml += '<tr><td>'+ "All Students Attempted" + '</td></tr>';
          };
          innerHtml += '</tbody>';

          var tableRoot = tooltipEl.querySelector('table');
          tableRoot.innerHTML = innerHtml;
        }

        var position = this._chart.canvas.getBoundingClientRect();

        //Set tooltip width & height
        if (tooltipModel.dataPoints[0].index>=0){
          let dataPoint = tooltipModel.dataPoints;
          let maxX = dataPoint[dataPoint.length-1].x;
          if (maxX>250) var tooltipWidth = ((maxX-183.48465)/2)
          else var tooltipWidth = ((maxX-10.6667)/2)
      }

        //Tooltip css
        tooltipEl.style.opacity = 1;
        tooltipEl.style.position = 'absolute';
        tooltipEl.style.left = position.left + tooltipWidth + window.pageXOffset + 'px'//position.left + window.pageXOffset + tooltipModel.caretX + 'px';
        tooltipEl.style.top = position.top + window.pageYOffset + tooltipModel.caretY + 'px';
        tooltipEl.style.fontFamily = tooltipModel._bodyFontFamily;
        tooltipEl.style.fontSize = '14px'
        tooltipEl.style.fontStyle = tooltipModel._bodyFontStyle;
        tooltipEl.style.padding = tooltipModel.yPadding + 'px ' + tooltipModel.xPadding + 'px';
        tooltipEl.style.pointerEvents = 'none';
        tooltipEl.style.background = 'rgb(33,31,31,0.9)';
        tooltipEl.style.border = '2px solid grey';
        tooltipEl.style.borderRadius = '5px';
        tooltipEl.style.color = 'white';
      },
    }
  }
});

function chartView(chartData) {
  chartData = chartData.filter(value => value.data.length != 0);
  let green = [],
    red = [],
    milestone = [],
    freeText = [],
    codeGreen = [],
    codeOrange = [],
    codeRed = [],
    checkpoint = [];
  chartData.forEach(({ data, type }) => {
    if (type == 'MS') {
      green.push(0);
      red.push(0);
      milestone.push(data.length);
      freeText.push(0);
      codeGreen.push(0);
      codeOrange.push(0);
      codeRed.push(0);
      checkpoint.push(0);
    } else if (type == 'FR') {
      green.push(0);
      red.push(0);
      milestone.push(0);
      freeText.push(data.length);
      codeGreen.push(0);
      codeOrange.push(0);
      codeRed.push(0);
      checkpoint.push(0);
    } else if (type == 'CP') {
      green.push(0);
      red.push(0);
      milestone.push(0);
      freeText.push(0);
      codeGreen.push(0);
      codeOrange.push(0);
      codeRed.push(0);
      checkpoint.push(data.length);
    } else {
      green.push(
        data.filter(({ Code, Answer }) => Code == 'codeGreen' && Answer).length
      );
      red.push(
        data.filter(({ Code, Answer }) => Code == 'codeRed' && Answer).length
      );
      milestone.push(0);
      freeText.push(0);
      codeGreen.push(
        data.filter(({ Code, Answer }) => Code == 'codeGreen' && !Answer).length
      );
      codeOrange.push(data.filter(({ Code }) => Code == 'codeOrange').length);
      codeRed.push(
        data.filter(({ Code, Answer }) => Code == 'codeRed' && !Answer).length
      );
      checkpoint.push(0);
    }
  });
  const ls = [
    'Correct',
    'Wrong',
    'CodeGreen',
    'CodeOrange',
    'CodeRed ',
    'Milestone',
    'Free Response',
    'Checkpoint'
  ];
  const backkgroundcolors = [
    'green',
    'red',
    '#77dd77',
    '#ffb347',
    '#ff6961',
    'grey',
    '#007fff',
    '#A86D43'
  ];
  const datas = [
    green,
    red,
    codeGreen,
    codeOrange,
    codeRed,
    milestone,
    freeText,
    checkpoint
  ];
  $('.chartHeight').css('height', chartData.length * 70 + 110);
  myChart.data = {
    labels: chartData.map(({ QnLabel }) => QnLabel),
    datasets: ls.map((label, i) => {
      return {
        label,
        backgroundColor: backkgroundcolors[i],
        data: datas[i],
        barPercentage: 0.5,
        barThickness: 6,
        maxBarThickness: 8,
        minBarLength: 2
      };
    })
  };
  myChart.update();
}

let chartInfoDataPoint;
document.getElementById('chart').onclick = function(evt) {
  var activePoints = myChart.getElementsAtEvent(evt);
  if (activePoints.length > 0) {
    modal.querySelector('.modal-header h2').innerHTML = chartInfoDataPoint =
      myChart.data.labels[activePoints[0]['_index']];
    chartInfoView();
  }
};

//Chart Info
let chartInfo = 'name';
let chartInfoDisplay = false;
function chartInfoToggle() {
  togglePieChart = false;
  $('.modal-body').removeClass('zeroPadding');
  if (chartInfo == 'name') {
    $('#chartToggle').html('Toggle List By Answer');
    chartInfo = 'answer';
    chartInfoFillData();
  } else {
    $('#chartToggle').html('Toggle List By Name');
    chartInfo = 'name';
    chartInfoFillData();
  }
}

function chartInfoView() {
  chartInfoDisplay = true;
  togglePieChart = false;
  $('.modal-body').removeClass('zeroPadding');
  refreshChartInfo();
  modal.style.display = 'block';
  $('.answerVisibility').css('color', 'transparent');
  $('.answerVisibility').css('text-shadow', '0 0 10px #000');
  $('.insertCodeClass').css('background-color', 'rgb(128,128,128)');
  $('.insertCodeClass').addClass('grey');
  if ($('.insertCodeClass').hasClass('tableResolvedRed')) $('.insertCodeClass').removeClass('tableResolvedRed');
  if ($('.insertCodeClass').hasClass('tableResolvedOrange')) $('.insertCodeClass').removeClass('tableResolvedOrange');
  $('.chartButton').show();
}

function refreshChartInfo() {
  console.log('Refresh Chart Info');
  $('#answerToggle').hide();
  $('#statusToggle').hide();
  data.chartInfos = data.nameArray
    .map(user =>
      user.progress.find(({ QnLabel }) => chartInfoDataPoint == QnLabel)
    )
    .filter(value => value)
    .sort((a,b)=> (a.HappendAt>b.HappendAt)?1:-1);
  if (togglePieChart) {
    togglePieChart = false;
    pieChartToggle();
  } else chartInfoFillData();
}

function chartInfoFillData() {
  const questionType = data.qnLabelArray.find(
    ({ QnLabel }) => QnLabel == data.chartInfos[0].QnLabel
  ).type;
  let message = '';

  if (questionType == 'TL') {
    $('#statusToggle').show();
    if (chartInfo == 'name') {
      message = `
    <div class="row" style="font-weight: bold;text-align: center;">
        <div class="col-6 breakword">Name</div>
        <div class="col-6 breakword">Status</div>
    </div>`;
    data.chartInfos.map((value, index) => {
      message += `
    <hr>
      <div class="row" style="font-size: 0.8em;">
      <div class="col-6 breakword tableCenter studentName">${value.Name}</div>
      <div class="col-6 breakword" style="display: flex;">`
      if ($('.insertCodeClass').hasClass('grey')){
        message +=`
        <div data-index ="${index}" id="insertCodeClass${index}" class="insertCodeClass grey" style="border-radius: 50%; height: 20px; width: 20px; margin: auto; background-color: rgb(128,128,128)"></div>
        </div>
        </div>`
      }
      else{
        message +=`
        <div data-index ="${index}" onclick="tableResolve(this)" id="insertCodeClass${index}" class="insertCodeClass ${
          value.Code == 'codeGreen'
            ? 'tableGreen'
            : value.Code == 'codeRed'
            ? value.resolved
              ? 'tableResolvedRed'
              : 'tableUnresolvedRed'
            : value.resolved
            ? 'tableResolvedOrange'
            : 'tableUnresolvedOrange'
        }" style="border-radius: 50%; height: 20px; width: 20px; margin: auto;"></div>
        </div>
        </div>`
      };
    });
    } else {
      $('#answerToggle').hide()
      $('#statusToggle').hide()
      message = `
      <div class="row" style="font-weight: bold;text-align: center;">
          <div class="col-4 breakword">Number</div>
          <div class="col-8 breakword">Code</div>
      </div>`;
      ['codeGreen', 'codeOrange', 'codeRed']
        .map(uniquecode => {
          return {
            uniquecode,
            number: data.chartInfos.filter(({ Code }) => Code == uniquecode)
              .length
          };
        })
        .filter(({ number }) => number != 0)
        .forEach(value => {
          message += `
          <hr>
          <div class="row" style="font-size: 0.8em;">
            <div class="col-4 breakword">${value.number}</div>
            <div class="col-8 breakword">${value.uniquecode}</div>
          </div>
        `;
        });
    }
  } else if (questionType == 'MS' || questionType == 'CP') {
    if (chartInfo == 'name') {
      message = `
    <div class="row" style="font-weight: bold;text-align: center;">
        <div class="col-12 breakword">Name</div>
    </div>`;
      data.chartInfos.map(({ Name }) => {
        message += `
          <hr>
          <div class="row" style="font-size: 0.8em;">
            <div class="col-12 breakword tableCenter">${Name}</div>
          </div>
          `
      });
    } else {
      message = `
      <div class="row" style="font-weight: bold;text-align: center;">
          <div class="col-12 breakword">Number</div>
      </div>
      <hr>
      <div class="row" style="font-size: 0.8em;">
        <div class="col-12 breakword">${data.chartInfos.length}</div>
      </div>
        `;
    }
  } else {
    
    if (chartInfo == 'name') {
      $('#answerToggle').show();
      $('#statusToggle').show();
      message = `
        <div class="row" style="font-weight: bold;text-align: center;">
            <div class="col-4 breakword">Name</div>
            <div class="col-5 breakword">Answer</div>
            <div class="col-3 breakword">Status</div>
        </div>`;
        data.chartInfos.map((value, index) => {
          message += `
          <hr>
          <div class="row" style="font-size: 0.8em;">
          <div class="col-4 breakword tableCenter studentName">${value.Name}</div>`
          if ($('.answerVisibility').css('text-shadow')!="none"){
            message += `
            <div class="col-5 breakword tableCenter answerVisibility" style="color: transparent; text-shadow: 0 0 10px #000">${value.Answer}</div>`
          }
          else{
            message += `
            <div class="col-5 breakword tableCenter answerVisibility">${value.Answer}</div>`
          }
          message += `
          <div class="col-3 breakword" style="display: flex;">`
          if ($('.insertCodeClass').hasClass("grey")){
            message +=`
            <div data-index ="${index}" id="insertCodeClass${index}" class="insertCodeClass grey" style="border-radius: 50%; height: 20px; width: 20px; margin: auto; background-color: rgb(128,128,128)"></div>
            </div>
            </div>`
          }
          else{
            message +=`
            <div data-index ="${index}" onclick="tableResolve(this)" id="insertCodeClass${index}" class="insertCodeClass ${
              value.Code == 'codeGreen'
                ? 'tableGreen'
                : value.Code == 'codeRed'
                ? value.resolved
                  ? 'tableResolvedRed'
                  : 'tableUnresolvedRed'
                : value.resolved
                ? 'tableResolvedOrange'
                : 'tableUnresolvedOrange'
            }" style="border-radius: 50%; height: 20px; width: 20px; margin: auto;"></div>
            </div>
            </div>`
          };
        });
    } else {
      $('#answerToggle').hide();
      $('#statusToggle').hide();
      message = `
        <div class="row" style="font-weight: bold;text-align: center;">
            <div class="col-4 breakword">Number</div>
            <div class="col-8 breakword">Answer</div>
        </div>`;
      [...new Set(data.chartInfos.map(({ Answer }) => Answer))]
        .map(uniqueanswer => {
          return {
            number: data.chartInfos.filter(
              ({ Answer }) => Answer == uniqueanswer
            ).length,
            uniqueanswer
          };
        })
        .sort((a, b) => {
          return a.number > b.number ? -1 : b.number > a.number ? 1 : 0;
        })
        .forEach(value => {
          message += `
        <hr>
        <div class="row" style="font-size: 0.8em;">
          <div class="col-4 breakword">${value.number}</div>
          <div class="col-8 breakword">${value.uniqueanswer}</div>
        </div>
      `;
        });
    }
  }

  modal.querySelector('.modal-body').innerHTML = message;
}

//Pie Chart
let togglePieChart = false;
function pieChartToggle() {
  $('#answerToggle').hide();
  $('#statusToggle').hide();
  counter = 0;
  colorsExcludingGreen = ["#7A92F2","#C18860","#FE5757", "#E67D32", "#E4D223","#F1ABE3","#6FA3CB","#EE9CA4","#47B8E5","#AB85CF"];
  redColors= ["#F9604C" ,"#ffbdbd", "#f57a7a"];
  if (!togglePieChart) {
    console.log('Toggle piechart');
    togglePieChart = true;
    modal.querySelector(
      '.modal-body'
    ).innerHTML = `<canvas id="piechart"></canvas>`;
    $('.modal-body').addClass('zeroPadding');

    const piectx = document.getElementById('piechart').getContext('2d');

    const questionType = data.qnLabelArray.find(
      ({ QnLabel }) => QnLabel == data.chartInfos[0].QnLabel
    ).type;

    let backgroundColor;

    let answers;
    const total = data.chartInfos.length;

    if (questionType == 'TL') {
      answers = [...new Set(data.chartInfos.map(({ Code }) => Code))].map(
        uniqueanswer => {
          return {
            number: data.chartInfos.filter(({ Code }) => Code == uniqueanswer)
              .length,
            uniqueanswer
          };
        }
      );
      backgroundColor = answers.map(({ uniqueanswer }) => {
        switch (uniqueanswer) {
          case 'codeGreen':
            return '#77dd77';
          case 'codeOrange':
            return '#ffb347';
          case 'codeRed':
            return '#ff6961';
        }
      });
    } else if (questionType == 'MS') {
      answers = [
        {
          number: data.chartInfos.length,
          uniqueanswer: 'Milestone'
        }
      ];
      backgroundColor = ['grey'];
    } else if (questionType == 'CP') {
      answers = [
        {
          number: data.chartInfos.length,
          uniqueanswer: 'Checkpoint'
        }
      ];
      backgroundColor = ['#A86D43'];
    } else if (questionType == 'FR') {
      answers = [...new Set(data.chartInfos.map(({ Answer }) => Answer))]
        .map(uniqueanswer => {
          return {
            number: data.chartInfos.filter(
              ({ Answer }) => Answer == uniqueanswer
            ).length,
            uniqueanswer
          };
        })
        .sort((a, b) => {
          return a.number > b.number ? -1 : b.number > a.number ? 1 : 0;
        });
      backgroundColor = answers.map(() => {
        if (counter<10){
          let color = colorsExcludingGreen[counter];
          counter++;
          return color;
        }
        else {
          let red = Math.floor(Math.random()*(255-60)+1)+60;
          let green  = Math.floor(Math.random()*(45)+1);
          let blue = Math.floor(Math.random()*(255)+1);
          return `rgb(${red}, ${green}, ${blue})`;
        };
      });
    } else {
      //MCQ or Text
      answers = [...new Set(data.chartInfos.map(({ Answer }) => Answer))]
        .map(uniqueanswer => {
          return {
            number: data.chartInfos.filter(
              ({ Answer }) => Answer == uniqueanswer
            ).length,
            uniqueanswer,
            code: data.chartInfos.find(s => s.Answer == uniqueanswer).Code
          };
        })
        .sort((a, b) => {
          return a.number > b.number ? -1 : b.number > a.number ? 1 : 0;
        });
      backgroundColor = answers.map(({ code, number }) => {
        if (code == 'codeGreen') return '#4baea0';
        else{
          if (counter<10){
            let color = redColors[counter];
            counter++;
            return color;
          }
          else{
            let red = Math.floor(Math.random()*(100)+1);
            return `rgb(254, ${red}, 0)`;
          };
        };
      });
    }

    new Chart(piectx, {
      type: 'pie',
      data: {
        datasets: [
          {
            data: answers.map(({ number }) => number),
            backgroundColor
          }
        ],
        labels: answers.map(({ uniqueanswer }) => uniqueanswer)
      },
      options: {
        aspectRatio: 1,
        responsive: false,
        animation: {
          duration: 0,
          onComplete: function() {
            var chartInstance = this.chart,
              ctx = chartInstance.ctx;
            ctx.font = Chart.helpers.fontString(
              Chart.defaults.global.defaultFontSize,
              'bold',
              Chart.defaults.global.defaultFontFamily
            );
            ctx.textAlign = 'top';
            ctx.textBaseline = 'top';
            this.data.datasets.forEach(function(dataset, i) {
              var meta = chartInstance.controller.getDatasetMeta(i);
              meta.data.forEach(function(element, index) {
                var data = dataset.data[index];
                if (data != 0) {
                  var padding = 5;
                  var position = element.tooltipPosition();
                  ctx.fillText(
                    Math.round((data / total) * 100) + '%',
                    position.x - 12,
                    position.y - 16 / 2 - padding
                  );
                }
              });
            });
          }
        }
      }
    });
  } else {
    togglePieChart = false;
    chartInfoView();
  }
}

//Resolve management
let resolvedData = [];
function tableResolve(event) {
  const index = $(event).data('index');
  const d = data.chartInfos[index];
  function resolveD() {
    data.dayData.map(data => (d == data ? (data.resolved = new Date()) : data));
    d.resolved = new Date();
    resolvedData.push({
      date: currentDay
        ? dt.dateToDateString(new Date())
        : $('#dateSelection').val(),
      title: $('#lessonSelection option:selected').html(),
      data: d
    });
    data.refreshJasonView();
  }
  if (!d.resolved) {
    if (d.Code == 'codeRed') {
      $(event)
        .removeClass('tableUnresolvedRed')
        .addClass('tableResolvedRed');
      resolveD();
    } else if (d.Code == 'codeOrange') {
      $(event)
        .removeClass('tableUnresolvedOrange')
        .addClass('tableResolvedOrange');
      resolveD();
    } else if (d.Code == 'codeGreen') return;
  }
}

var clicks = 0;
function dynamicFeedback() {
  clicks++; // Issue with global clicks
  if (clicks == 1) {
    displayInfo = () => {
      modal.querySelector('.modal-header h2').innerHTML = `${this.getAttribute(
        'data-name'
      )} - ${this.getAttribute('data-qn-label')}`;
      
      modal.querySelector('.modal-body').innerHTML = this.getAttribute(
        'data-answer'
      );
      $('.chartButton').hide();
      $('#answerToggle').hide();
      $('#statusToggle').hide();
      modal.style.display = 'block';
      clicks = 0;
    };
    clickTimer = setTimeout(displayInfo, DOUBLECLICK_DELAY);
  } else {
    clearTimeout(clickTimer); // If double click, else show DisplayInfo
    clicks = 0;
  }
}

function resolveAlert(e) {
  e.preventDefault();
  if ($(this).hasClass('resolved')) return;
  if (
    $(this).hasClass('cellcodeOrangeUnresolved') ||
    $(this).hasClass('cellcodeRedUnresolved') ||
    $(this).hasClass('cellWrong')
  ) {
    $(this).addClass('resolved');
    data.dayData[this.getAttribute('data-index-hist')].resolved = new Date();
    resolvedData.push({
      date: currentDay
        ? dt.dateToDateString(new Date())
        : $('#dateSelection').val(),
      title: $('#lessonSelection option:selected').html(),
      data: data.dayData[this.getAttribute('data-index-hist')]
    });
  }
}

const todayDate = dt.dateToDateString(new Date());

// Exporting Functions Json and CSV
function exportToJsonFile() {
  let dataStr = JSON.stringify(data.dayData);
  let dataUri =
    'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
  let exportFileDefaultName = 'data.json';
  let linkElement = document.createElement('a');
  linkElement.setAttribute('href', dataUri);
  linkElement.setAttribute('download', exportFileDefaultName);
  linkElement.click();
}

function exportToCSV() {
  const changedData = data.dayData.map(value => {
    return {
      Name: value.Name,
      QnLabel: value.QnLabel,
      Answer: value.Answer ? value.Answer : '',
      Code: value.Code ? value.Code : '',
      HappendAt: value.HappendAt,
      resolved: value.resolved ? value.resolved : '',
      Title: value.Title
    };
  });
  const headers = {
    Name: 'Name',
    QnLabel: 'QnLabel',
    Answer: 'Answer',
    Code: 'Code',
    HappendAt: 'HappendAt',
    resolved: 'Resolved At',
    Title: 'Title'
  };

  if (headers) {
    changedData.unshift(headers);
  }
  var jsonObject = JSON.stringify(changedData);

  var csv = (jsonObject => {
    var array =
      typeof jsonObject != 'object' ? JSON.parse(jsonObject) : jsonObject;
    var str = '';

    for (var i = 0; i < array.length; i++) {
      var line = '';
      for (var index in array[i]) {
        if (line != '') line += ',';

        line += array[i][index];
      }

      str += line + '\r\n';
    }

    return str;
  })(jsonObject);

  var exportedFilenmae =
    `coursedata${
      currentDay ? dt.dateToDateString(new Date()) : $('#dateSelection').val()
    }.csv` || 'export.csv';

  var blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  if (navigator.msSaveBlob) {
    // IE 10+
    navigator.msSaveBlob(blob, exportedFilenmae);
  } else {
    var link = document.createElement('a');
    if (link.download !== undefined) {
      // feature detection
      // Browsers that support HTML5 download attribute
      var url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', exportedFilenmae);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }
}

function isEquivalent(a, b) {
  var aProps = Object.getOwnPropertyNames(a);
  var bProps = Object.getOwnPropertyNames(b);
  if (aProps.length != bProps.length) return false;
  for (var i = 0; i < aProps.length; i++) {
    var propName = aProps[i];
    if (a[propName] !== b[propName]) {
      if (propName == 'HappendAt') {
        if (a[propName].getTime() !== b[propName].getTime()) return false;
      } else return false;
    }
  }
  return true;
}

//toggle visibility
function answerToggle(){
  if($('.answerVisibility').css("text-shadow")!="none"){
    $(".answerVisibility").css("color", "");
    $(".answerVisibility").css("textShadow", "none");
  }
  else{
    $(".answerVisibility").css("color", "transparent");
    $(".answerVisibility").css("textShadow", "0 0 10px #000");
  }
}

function statusToggle(){
  data.chartInfos.map((value, index) => {
    
    let idName = '#insertCodeClass'+ index
    if ($(idName).hasClass('grey')){
      $(idName).css('background', '');
      $(idName).addClass(
      value.Code == 'codeGreen'
      ? 'tableGreen'
      : value.Code == 'codeRed'
      ? value.resolved
      ? 'tableResolvedRed'
      : 'tableUnresolvedRed'
      : value.resolved
      ? 'tableResolvedOrange'
      : 'tableUnresolvedOrange'
      );
      $(idName).removeClass('grey');
      $(idName).attr('onClick', 'tableResolve(this)');
    }
    else {
      $(idName).removeClass();
      $(idName).addClass('insertCodeClass');
      $(idName).addClass('grey');
      $(idName).css('background-color', 'rgb(128, 128, 128)');
      $(idName).prop('onclick', null).off("click");
    }
  })
}

//lesson filter button
function lessonFilter(){
  if ($("#lessonFilter").text()=="ON"){
    $('#lessonFilter').html('OFF');
    $('#lessonFilter').removeClass("btn-primary").addClass("btn-danger");
    $('#lessonSelection').attr('disabled', true);
  }
  else{
    $('#lessonFilter').html('ON');
    $('#lessonFilter').removeClass("btn-danger").addClass("btn-primary");
    $('#lessonSelection').attr('disabled', false);
  }
}
