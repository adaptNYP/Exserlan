const LSK = "keys"; //Local Storage Key
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

var dbID = $("#surveyJSDBid").val();
var dbaccessKey = $("#surveyJSDBaccessKey").val();
let slider = document.getElementById("myRange");

// Get the <span> element that closes the modal
var span = document.getElementsByClassName("close")[0];

// Get the modal
var modal = document.getElementById("myModal");

// When the user clicks on <span> (x), close the modal
span.onclick = () => (modal.style.display = "none");

window.onclick = event =>
  event.target == modal ? (modal.style.display = "none") : "";

function useMe(evt) {
  $("#surveyJSDBid").val($(evt).data().dbid);
  $("#surveyJSDBaccessKey").val($(evt).data().dbaccesskey);
  start();
}

$("#clearID").click(() => {
  window.localStorage.removeItem(LSK);
  loadIDHolder();
});

$("#startButton").click(() => start());

$("#clearButton").click(() => {
  $("#surveyJSDBid").val("");
  $("#surveyJSDBaccessKey").val("");
});

$("#stopButton").click(() => {
  clearInterval(refreshInterval);
  refreshInterval = null;
});

slider.oninput = function() {
  $("#sliderOutput").html(dt.formatTime(this.value));
  data.dataNewTime(dt.secondsToDate(this.value));
};

function loadIDHolder() {
  const keys = JSON.parse(window.localStorage.getItem(LSK));
  $("#firstKeyRow")
    .nextAll()
    .remove();
  if (keys) {
    $("#keyRowList").show();
    let appendingHTML = "";
    keys.forEach(({ dbID, dbaccessKey }) => {
      appendingHTML += `
        <hr>
        <div class="row">
            <div class="col-5">
                <p class="wordBreak">${dbID}</p>
            </div>
            <div class="col-5">
                <p class="wordBreak">${dbaccessKey}</p>
            </div>
            <div class="col-2 nopadding" style="display: flex">
                <button class="btn btn-success btn-sm useMe" onclick="useMe(this)"data-dbID="${dbID}" data-dbaccessKey="${dbaccessKey}" style="margin: auto;">Use</button>
            </div>
        </div>
    `;
    });
    $("#firstKeyRow").after(appendingHTML);
  } else $("#keyRowList").hide();
}
loadIDHolder();

function toggleCurrent() {
  if (useCurrentTime) {
    useCurrentTime = false;
    $("#currentB").html("False");
    clearInterval(currentTimeInterval);
    currentTimeInterval = null;
    $("#holding").hide();
    data.setUp();
  } else {
    useCurrentTime = true;
    $("#currentB").html("True");
    if (!currentTimeInterval) data.setUp();
  }
}

//////////////////////////////////////////////////Start
function start() {
  if (dbID && dbaccessKey) {
    $("#surveyJSDBid, #surveyJSDBaccessKey, #startButton").prop(
      "disabled",
      true
    );
    $("#firstLoading").show();
    data
      .getData(dbID, dbaccessKey)
      .then(data => {
        let ka = JSON.parse(window.localStorage.getItem(LSK));
        if (!ka) ka = [];
        if (!ka.find(k => k.dbID == dbID && k.dbaccessKey == dbaccessKey)) {
          ka.push({ dbID, dbaccessKey });
          window.localStorage.setItem(LSK, JSON.stringify(ka));
          loadIDHolder();
        }
        if (data.length == 0) alert("No data");
        else mainPageProcessing();
      }) // .catch(() => alert("Invalid dbID/dbaccessKey"))
      .finally(() => {
        $("#surveyJSDBid, #surveyJSDBaccessKey, #startButton").prop(
          "disabled",
          false
        );
        $("#firstLoading").hide();
      });
  } else alert("Empty dbID/dbaccessKey");
}

function mainPageProcessing() {
  $(".firstPage").hide();
  $(".runningPage").show();
  runningRefresh(); //First run
  runRefeshInterval();
}

function runRefeshInterval() {
  let refreshLimit = {
    limit: REFRESH_DEFAULT_LIMIT,
    restart: () => (this.limit = REFRESH_DEFAULT_LIMIT)
  };
  refreshInterval = setInterval(() => {
    console.log("Refreshing");
    let oldDataLength = [...data.ajaxData].length;
    data
      .getData(dbID, dbaccessKey)
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
      alert("Refesh limit hit, error with connection");
      $(".firstPage").show();
    }
  }, REFRESH_DATA_RATE);
}

//Main function for running
function runningRefresh() {
  console.log("Refreshing page data");
  data.mainSort();
}

function changeDate(evt) {
  $(slider).val(50);
  changeDateVariable = true;
  data.setDate(new Date(evt.options[evt.selectedIndex].text));
}

const data = new (class {
  dbRootURL = "https://dxsurvey.com/api/MySurveys/getSurveyResults/";
  ajaxData = []; //All Data
  sortedData = [];
  dayData = []; //Selected Date Data
  dayEndTime; // Day EndTime
  resolveData = []; //Resolved Data
  nameArray = []; //Name Data, Jason's View
  qnLabelArray = []; //QnLabel Data for Charts
  getData(dbID, dbaccessKey) {
    return new Promise((resolve, reject) => {
      $.ajax({
        type: "GET",
        url: `${this.dbRootURL + dbID}?accessKey=${dbaccessKey}`,
        dataType: "json"
      })
        .done(value => resolve((this.ajaxData = value.Data)))
        .fail((jqXHR, textStatus) => reject(new Error(textStatus)));
    });
  }
  mainSort() {
    changeDateVariable = true;
    let d = (this.sortedData = this.ajaxData.concat());
    d.map(value => {
      let date = new Date(value.HappendAt);
      if (date.getHours() >= 16) date = new Date(date.getTime() - 16 * 3600000);
      else date = new Date(date.getTime() + 8 * 3600000);
      return (value.HappendAt = date);
    });
    d.sort((a, b) => new Date(b.HappendAt) - new Date(a.HappendAt));
    let uniqueDates = [
      ...new Set(d.map(({ HappendAt }) => dt.dateToDateString(HappendAt)))
    ];
    let holder = $("#dateSelection").val();
    $("#dateSelection").html(() => {
      let newArray = uniqueDates
        .map(d => (d != todayDate ? `<option>${d}</option>` : undefined))
        .filter(a => a);
      newArray.unshift(`<option>${todayDate} (Today)</option>`);
      return newArray.reduce((a, b) => a + b);
    });
    if (holder) {
      $("#dateSelection").val(holder);
      this.setDate(new Date(holder));
    } else this.setDate(new Date());
  }

  //Activate when change date
  setDate(date) {
    this.dayData = this.arrayToDate(this.sortedData, date);

    //If selected date doesn't have data, only applicable for today's date
    if (this.dayData.length == 0) {
      $(".sliderDiv").hide();
      $("#studentsProgress").html("<p>No Data for this date</p>");
      if (!refreshInterval && !incomingNewData) runRefeshInterval();
      return;
    } else $(".sliderDiv").show();

    //Get latest time
    this.dayEndTime = this.dayData[0].HappendAt;
    if (dt.dateToDateString(date) == todayDate) {
      useCurrentTime = $("#currentB").text() == "False" ? false : true;
      $("#current").show();
      if (!refreshInterval && !incomingNewData) runRefeshInterval();
    } else {
      useCurrentTime = false;
      clearInterval(refreshInterval);
      refreshInterval = null;
      $("#current").hide();
    }
    incomingNewData = false;
    this.setUp();
  }

  //Activate with useCurrentTime button
  setUp() {
    const earliestTime = this.dayData[this.dayData.length - 1].HappendAt;
    const minValue = dt.dateToSeconds(earliestTime);
    const maxValue = dt.dateToSeconds(this.dayEndTime);
    const maxString = dt.dateToTimeString(this.dayEndTime);
    $(slider).attr("min", minValue);

    //Testing
    $("#startTime").text(dt.dateToTimeString(earliestTime));
    // $("#endTime").text(maxString);

    //If there is a change of date/html is not set
    if ($("#sliderOutput").html() == "" || changeDateVariable)
      $("#sliderOutput").html(maxString);

    //Check if use current time
    if (useCurrentTime) {
      if (!currentTimeInterval) this.runCurrentInterval();
    } else {
      clearInterval(currentTimeInterval);
      currentTimeInterval = null;
      $("#now").hide();
      $(slider).attr("max", maxValue);
      if (changeDateVariable) {
        changeDateVariable = false;
        $(slider).val(maxValue);
        $("#sliderOutput").html(maxString);
        this.dataNewTime(this.dayEndTime);
      } else this.dataNewTime(dt.secondsToDate($(slider).val()));
    }
  }
  holdingMode = null;
  timeInterval = 0;
  runCurrentInterval() {
    $("#now").show();
    $("#holding").show();
    this.holdingMode = null;
    this.timeInterval = 0;
    this.currentInterval();
    currentNewData = true;
  }
  currentInterval() {
    currentTimeInterval = setInterval(() => {
      const currentTime = new Date();
      const currentSeconds = dt.dateToSeconds(currentTime);
      slider.setAttribute("max", currentSeconds);
      $("#now").html(dt.dateToTimeString(currentTime));
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
        $("#holding").text("(Lock)");
        $(slider).val(currentSeconds);
        $("#sliderOutput").html(dt.dateToTimeString(currentTime));
        if (currentNewData) this.dataNewTime(currentTime);
      } else {
        $("#holding").text("(Free)");
        this.holdingMode = false;
        this.dataNewTime(dt.secondsToDate(parseInt($(slider).val())));
      }
      currentNewData = false;
    }, this.timeInterval);
  }

  dataNewTime(date) {
    date = new Date(date.getTime() + 1000); //Hacks
    this.nameArray = this.arrayByNames(this.dayData, date);
    jasonView(this.nameArray);
    this.qnLabelArray = this.arrayByQnLabel(this.dayData, date);
  }
  arrayToDate(a, date) {
    return a.filter(
      ({ HappendAt }) =>
        HappendAt.getFullYear() == date.getFullYear() &&
        HappendAt.getMonth() == date.getMonth() &&
        HappendAt.getDate() == date.getDate()
    );
  }
  arrayByNames(a, time = new Date()) {
    return this.arraySortString(
      [...new Set(a.map(({ Name }) => Name))].map(name => {
        let c = a.filter(
          ({ Name, HappendAt }) => name == Name && HappendAt <= time
        );
        return {
          name,
          progress: this.arraySortString(
            [...new Set(c.map(({ QnLabel }) => QnLabel))].map(QnLabel =>
              c.find(s => s.QnLabel == QnLabel)
            ),
            "QnLabel"
          )
        };
      }),
      "Name"
    );
  }
  arrayByQnLabel(a, time = new Date()) {
    return this.arraySortString(
      [...new Set(a.map(({ QnLabel }) => QnLabel))].map(QnLabel => {
        let c = a.filter(v => QnLabel == v.QnLabel && v.HappendAt <= time);
        return {
          QnLabel,
          data: [...new Set(c.map(({ Name }) => Name))].map(Name =>
            c.find(s => s.Name == Name)
          ),
          type: !c.find(s => s.Code && s.Answer)
            ? "MS" //Milestone
            : !c.find(s => s.Code)
            ? "FA" //Free Answer
            : !c.find(s => s.Answer)
            ? "TL" //Traffic Light
            : ""
        };
      }),
      "QnLabel"
    );
  }
  arraySortString(array, name, ascdesc = "desc") {
    return array.sort((a, b) => {
      return ascdesc == "desc"
        ? a[name] < b[name]
          ? -1
          : b[name] < a[name]
          ? 1
          : 0
        : ascdesc == "asc"
        ? a[name] > b[name]
          ? -1
          : b[name] > a[name]
          ? 1
          : 0
        : new Error("Unable to sort");
    });
  }
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

function jasonView(a) {
  $("#studentsProgress").html("");
  if ("content" in document.createElement("template")) {
    a.forEach(({ name, progress }, indexHist) => {
      var studentTemplate = document.querySelector("#studentTemplate");
      var studentRow = document.importNode(studentTemplate.content, true);
      studentRow.querySelector(".studentName").innerHTML = name;
      progress.forEach(({ QnLabel, Answer, Code, resolved }, indexProg) => {
        var cellTemplate = document.querySelector("#cellTemplate");
        var cloneCell = document.importNode(cellTemplate.content, true);
        cloneCell.querySelector(".progressCell").dataset.name = name;
        cloneCell.querySelector(".progressCell").innerHTML = QnLabel;
        cloneCell.querySelector(".progressCell").dataset.qnLabel = QnLabel;
        cloneCell.querySelector(".progressCell").dataset.indexHist = indexHist;
        cloneCell.querySelector(".progressCell").dataset.indexProg = indexProg;
        cloneCell
          .querySelector(".progressCell")
          .classList.add(
            (() =>
              ["A", "B", "C", "D"]
                .filter(value => value == QnLabel.charAt(0))
                .map(value => `class${value}`)[0])()
          );
        if (!(typeof Code === "undefined") && Code) {
          cloneCell.querySelector(".progressCell").classList.add(Code);
          cloneCell.querySelector(".progressCell").dataset.code = Code;
        }
        if (!(typeof Answer === "undefined") && Answer) {
          cloneCell
            .querySelector(".progressCell")
            .classList.add("feedbackCell");
          cloneCell.querySelector(".progressCell").dataset.answer = Answer;
        }
        if (!(typeof resolved === "undefined") && resolved)
          cloneCell.querySelector(".progressCell").classList.add("resolved");
        studentRow.querySelector(".cellBody").appendChild(cloneCell);
        $(studentRow)
          .find(".feedbackCell:last-child")
          .click(dynamicFeedback);
        $(studentRow)
          .find(".progressCell:last-child")
          .dblclick(resolveAlert);
      });
      document.getElementById("studentsProgress").appendChild(studentRow);
    });
  } else console.log("Template doesn't work");
}

var clicks = 0;
function dynamicFeedback() {
  clicks++; // Issue with global clicks
  if (clicks == 1) {
    displayInfo = () => {
      modal.querySelector(".modal-header h2").innerHTML = `${this.getAttribute(
        "data-name"
      )} - ${this.getAttribute("data-qn-label")}`;

      modal.querySelector(".modal-body").innerHTML = this.getAttribute(
        "data-answer"
      );
      $(".chartButton").hide();
      modal.style.display = "block";
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
  if ($(this).hasClass("codeOrange") || $(this).hasClass("codeRed")) {
    // add class to change border style of cell
    $(this).addClass("resolved");

    var indexHist = this.getAttribute("data-index-hist");
    var indexProg = this.getAttribute("data-index-prog");
    console.log(indexHist);
    console.log(indexProg);
    var thisStudentProgress = data.nameArray[indexHist].progress;
    thisStudentProgress[indexProg].resolved = 1;
  }
}

const todayDate = dt.dateToDateString(new Date());

//Testing
$("#startButton").click();
