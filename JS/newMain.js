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
let currentDay = false;

var dbID = $("#surveyJSDBid").val();
var dbaccessKey = $("#surveyJSDBaccessKey").val();
let slider = document.getElementById("myRange");

// Get the <span> element that closes the modal
var span = document.getElementsByClassName("close")[0];

// Get the modal
var modal = document.getElementById("myModal");

// When the user clicks on <span> (x), close the modal
span.onclick = () => {
  modal.style.display = "none";
  chartInfoDisplay = false;
};

window.onclick = event => {
  event.target == modal ? (modal.style.display = "none") : "";
  chartInfoDisplay = false;
};

function useMe(evt) {
  $("#surveyJSDBid").val((_dbid = $(evt).data().dbid));
  $("#surveyJSDBaccessKey").val((_dbaccesskey = $(evt).data().dbaccesskey));
  start();
}
let _dbid, _dbaccesskey;

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
  if (_dbid && _dbaccesskey) {
    dbID = _dbid;
    dbaccessKey = _dbaccesskey;
  } else {
    dbID = $("#surveyJSDBid").val();
    dbaccessKey = $("#surveyJSDBaccessKey").val();
  }
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
  sChart = false;
  $(".chartHeight").hide();
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
  chartInfos = []; //Chart info after clicking bar chart

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
      console.log("This date no data");
      $(".sliderDiv").hide();
      $("#studentsProgress").html("<p>No Data for this date</p>");
      $("#buttons").hide();
      if (!refreshInterval && !incomingNewData) runRefeshInterval();
      return;
    } else {
      $(".sliderDiv").show();
      $("#buttons").show();
    }

    //Get latest time
    this.dayEndTime = this.dayData[0].HappendAt;
    if (dt.dateToDateString(date) == todayDate) {
      useCurrentTime = $("#currentB").text() == "False" ? false : true;
      currentDay = true;
      $("#current").show();
      if (!refreshInterval && !incomingNewData) runRefeshInterval();
    } else {
      useCurrentTime = false;
      currentDay = false;
      clearInterval(refreshInterval);
      refreshInterval = null;
      $("#current").hide();
    }
    incomingNewData = false;

    //Add resolved data
    let cDate =
      currentDay || !$("#dateSelection").val()
        ? dt.dateToDateString(new Date())
        : $("#dateSelection").val();
    let resolvedThisDateData = resolvedData.filter(s => s.date == cDate);
    if (resolvedThisDateData) {
      for (let i = 0; i < resolvedThisDateData.length; i++) {
        const { Answer, Code, HappendAt, Name, QnLabel } = resolvedThisDateData[
          i
        ].data;
        let rd = {
          Code,
          QnLabel,
          Name,
          Answer,
          HappendAt
        };
        this.dayData = this.dayData.map(data =>
          isEquivalent(data, rd) ? (data = resolvedThisDateData[i].data) : data
        );
      }
    }
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
        if (currentDay)
          return this.dataNewTime(dt.secondsToDate($(slider).val()));
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
      if (refreshChartInfo) refreshChartInfo();
    }
  }
  runChartView() {
    console.log("run chart");
    this.qnLabelArray = this.arrayByQnLabel(this.dayData, this.dateHolder);
    chartView(this.qnLabelArray);
  }
  refreshJasonView() {
    this.nameArray = this.arrayByNames(this.dayData, this.dateHolder);
    jasonView(this.nameArray);
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
    let newArray = [...new Set(a.map(({ Name }) => Name))].map(name => {
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
    });
    if (!sortNameBy) return newArray;
    return this.arraySortString(newArray, "name", sortNameBy);
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
          type: !c.find(s => s.Code || s.Answer)
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

//Name View
function jasonView(a) {
  $("#studentsProgress").html("");
  if ("content" in document.createElement("template")) {
    a.forEach(({ name, progress }) => {
      var studentTemplate = document.querySelector("#studentTemplate");
      var studentRow = document.importNode(studentTemplate.content, true);
      studentRow.querySelector(".studentName").innerHTML = name;
      progress.forEach(d => {
        const { QnLabel, Answer, Code, resolved } = d;
        var cellTemplate = document.querySelector("#cellTemplate");
        var cloneCell = document.importNode(cellTemplate.content, true);
        cloneCell.querySelector(".progressCell").dataset.name = name;
        cloneCell.querySelector(".progressCell").innerHTML = QnLabel;
        cloneCell.querySelector(".progressCell").dataset.qnLabel = QnLabel;
        cloneCell.querySelector(
          ".progressCell"
        ).dataset.indexHist = data.dayData.findIndex(dd => d == dd);
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

let sortNameBy = "";
function sortName() {
  if (sortNameBy == "desc") {
    sortNameBy = "asc";
    jasonView(data.arraySortString(data.nameArray, "name", "asc"));
    $("#sortName").text("Sort by Name (Ascending)");
  } else if (sortNameBy == "asc") {
    sortNameBy = "desc";
    $("#sortName").text("Sort by Name (Decending)");
    jasonView(data.arraySortString(data.nameArray, "name"));
  }
}

//Chart
let sChart = false;
function showChart() {
  if (sChart) {
    $(".chartHeight").hide();
    sChart = false;
  } else {
    sChart = true;
    $(".chartHeight").show();
    data.runChartView();
  }
}

const ctx = document.getElementById("chart").getContext("2d");
const myChart = new Chart(ctx, {
  type: "horizontalBar",
  data: {},
  options: {
    aspectRatio: 1,
    maintainAspectRatio: false,
    // onResize: () => console.log("asdasd"),
    animation: {
      duration: 0,
      onComplete: function() {
        var chartInstance = this.chart,
          ctx = chartInstance.ctx;
        ctx.font = Chart.helpers.fontString(
          Chart.defaults.global.defaultFontSize,
          "bold",
          Chart.defaults.global.defaultFontFamily
        );
        ctx.textAlign = "top";
        ctx.textBaseline = "top";
        this.data.datasets.forEach(function(dataset, i) {
          var meta = chartInstance.controller.getDatasetMeta(i);
          meta.data.forEach(function(bar, index) {
            var data = dataset.data[index];
            if (data != 0) {
              ctx.fillStyle = "black";
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
    codeRed = [];

  chartData.forEach(({ data, type }) => {
    if (type == "MS") {
      green.push(0);
      red.push(0);
      milestone.push(data.length);
      freeText.push(0);
      codeGreen.push(0);
      codeOrange.push(0);
      codeRed.push(0);
    } else if (type == "FA") {
      green.push(0);
      red.push(0);
      milestone.push(0);
      freeText.push(data.length);
      codeGreen.push(0);
      codeOrange.push(0);
      codeRed.push(0);
    } else {
      green.push(
        data.filter(({ Code, Answer }) => Code == "codeGreen" && Answer).length
      );
      red.push(
        data.filter(({ Code, Answer }) => Code == "codeRed" && Answer).length
      );
      milestone.push(0);
      freeText.push(0);
      codeGreen.push(
        data.filter(({ Code, Answer }) => Code == "codeOrange" && !Answer)
          .length
      );
      codeOrange.push(data.filter(({ Code }) => Code == "codeOrange").length);
      codeRed.push(
        data.filter(({ Code, Answer }) => Code == "codeRed" && !Answer).length
      );
    }
  });
  myChart.data = {
    labels: chartData.map(({ QnLabel }) => QnLabel),
    datasets: [
      {
        label: "Correct",
        backgroundColor: "green",
        data: green
      },
      {
        label: "Wrong",
        backgroundColor: "red",
        data: red
      },
      {
        label: "CodeGreen",
        backgroundColor: "#77dd77",
        data: codeGreen
      },
      {
        label: "CodeOrange",
        backgroundColor: "#ffb347",
        data: codeOrange
      },
      {
        label: "CodeRed ",
        backgroundColor: "#ff6961",
        data: codeRed
      },
      {
        label: "Milestone",
        backgroundColor: "grey",
        data: milestone
      },
      {
        label: "Free Response",
        backgroundColor: "#007fff",
        data: freeText
      }
    ]
  };
  myChart.update();
}

let chartInfoDataPoint;
document.getElementById("chart").onclick = function(evt) {
  var activePoints = myChart.getElementsAtEvent(evt);
  if (activePoints.length > 0) {
    modal.querySelector(".modal-header h2").innerHTML = chartInfoDataPoint =
      myChart.data.labels[activePoints[0]["_index"]];
    chartInfoView();
  }
};

//Chart Info
let chartInfo = "name";
let chartInfoDisplay = false;
function chartInfoToggle() {
  togglePieChart = false;
  $(".modal-body").removeClass("zeroPadding");
  if (chartInfo == "name") {
    $("#chartToggle").html("Toggle List By Answer");
    chartInfo = "answer";
    chartInfoFillData();
  } else {
    $("#chartToggle").html("Toggle List By Name");
    chartInfo = "name";
    chartInfoFillData();
  }
}

function chartInfoView() {
  chartInfoDisplay = true;
  togglePieChart = false;
  $(".modal-body").removeClass("zeroPadding");
  refreshChartInfo();
  modal.style.display = "block";
  $(".chartButton").show();
}
function refreshChartInfo() {
  data.chartInfos = data.nameArray
    .map(user =>
      user.progress.find(({ QnLabel }) => chartInfoDataPoint == QnLabel)
    )
    .filter(value => value);
  chartInfoFillData();
}

function chartInfoFillData() {
  let message = "";
  if (chartInfo == "name") {
    message = `
      <div class="row" style="font-weight: bold;text-align: center;">
          <div class="col-4 breakword">Name</div>
          <div class="col-6 breakword">Answer</div>
          <div class="col-2 breakword">UR</div>
      </div>`;
    data.chartInfos.map((value, index) => {
      message += `
      <hr>
      <div class="row" style="font-size: 0.8em;">
        <div class="col-4 breakword tableCenter">${value.Name}</div>
        <div class="col-6 breakword tableCenter">${value.Answer}</div>
        <div class="col-2 breakword" style="display: flex;">
          <div data-index ="${index}" onclick="tableResolve(this)" class="${
        value.Code == "codeGreen"
          ? "tableGreen"
          : value.Code == "codeRed"
          ? value.resolved
            ? "tableResolvedRed"
            : "tableUnresolvedRed"
          : value.resolved
          ? "tableResolvedOrange"
          : "tableUnresolvedOrange"
      }" style="border-radius: 50%; height: 20px; width: 20px; margin: auto;"></div>
        </div>
      </div>
      `;
    });
  } else {
    message = `
      <div class="row" style="font-weight: bold;text-align: center;">
          <div class="col-4 breakword">Number</div>
          <div class="col-8 breakword">Answer</div>
      </div>`;
    [...new Set(data.chartInfos.map(({ Answer }) => Answer))]
      .map(uniqueanswer => {
        return {
          number: data.chartInfos.filter(({ Answer }) => Answer == uniqueanswer)
            .length,
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
  modal.querySelector(".modal-body").innerHTML = message;
}

//Pie Chart
let togglePieChart = false;
function pieChartToggle() {
  if (!togglePieChart) {
    togglePieChart = true;
    modal.querySelector(
      ".modal-body"
    ).innerHTML = `<canvas id="piechart"></canvas>`;
    $(".modal-body").addClass("zeroPadding");

    const piectx = document.getElementById("piechart").getContext("2d");

    const uniqueanswer = [
      ...new Set(data.chartInfos.map(({ Answer }) => Answer))
    ];

    let answers = uniqueanswer
      .map(uniqueanswer => {
        return {
          number: data.chartInfos.filter(({ Answer }) => Answer == uniqueanswer)
            .length,
          uniqueanswer,
          code: data.chartInfos.find(s => s.Answer == uniqueanswer).Code
        };
      })
      .sort((a, b) => {
        return a.number > b.number ? -1 : b.number > a.number ? 1 : 0;
      });
    const total = answers
      .map(({ number }) => number)
      .reduce((a, b) => a + b, 0);

    const datasets = [
      {
        data: answers.map(({ number }) => number),
        backgroundColor: answers.map(({ Code }, index) => {
          if (Code == "codeGreen") return "#4baea0";
          else red = Math.floor(Math.random() * 175) + 50;
          return `rgb(254, ${red}, ${red})`;
        })
      }
    ];

    new Chart(piectx, {
      type: "pie",
      data: {
        datasets,
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
              "bold",
              Chart.defaults.global.defaultFontFamily
            );
            ctx.textAlign = "top";
            ctx.textBaseline = "top";
            this.data.datasets.forEach(function(dataset, i) {
              var meta = chartInstance.controller.getDatasetMeta(i);
              meta.data.forEach(function(element, index) {
                var data = dataset.data[index];
                if (data != 0) {
                  var padding = 5;
                  var position = element.tooltipPosition();
                  ctx.fillText(
                    (data / total) * 100 + "%",
                    position.x,
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
  const index = $(event).data("index");
  const d = data.chartInfos[index];
  function resolveD() {
    data.dayData.map(data => (d == data ? (data.resolved = new Date()) : data));
    d.resolved = new Date();
    resolvedData.push({
      date: currentDay
        ? dt.dateToDateString(new Date())
        : $("#dateSelection").val(),
      data: d
    });
    data.refreshJasonView();
  }
  if (!d.resolved) {
    if (d.Code == "codeRed") {
      $(event)
        .removeClass("tableUnresolvedRed")
        .addClass("tableResolvedRed");
      resolveD();
    } else if (d.Code == "codeOrange") {
      $(event)
        .removeClass("tableUnresolvedOrange")
        .addClass("tableResolvedOrange");
      resolveD();
    } else if (d.Code == "codeGreen") return;
  }
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
  if ($(this).hasClass("resolved")) return;
  if ($(this).hasClass("codeOrange") || $(this).hasClass("codeRed")) {
    $(this).addClass("resolved");
    data.dayData[this.getAttribute("data-index-hist")].resolved = new Date();
    resolvedData.push({
      date: currentDay
        ? dt.dateToDateString(new Date())
        : $("#dateSelection").val(),
      data: data.dayData[this.getAttribute("data-index-hist")]
    });
  }
}

const todayDate = dt.dateToDateString(new Date());

// Exporting Functions Json and CSV
function exportToJsonFile() {
  let dataStr = JSON.stringify(data.dayData);
  let dataUri =
    "data:application/json;charset=utf-8," + encodeURIComponent(dataStr);
  let exportFileDefaultName = "data.json";
  let linkElement = document.createElement("a");
  linkElement.setAttribute("href", dataUri);
  linkElement.setAttribute("download", exportFileDefaultName);
  linkElement.click();
}

function exportToCSV() {
  const changedData = data.dayData.map(value => {
    return {
      Name: value.Name,
      QnLabel: value.QnLabel,
      Answer: value.Answer ? value.Answer : "",
      Code: value.Code ? value.Code : "",
      HappendAt: value.HappendAt,
      resolved: value.resolved ? value.resolved : ""
    };
  });
  const headers = {
    Name: "Name",
    QnLabel: "QnLabel",
    Answer: "Answer",
    Code: "Code",
    HappendAt: "HappendAt",
    resolved: "Resolved At"
  };

  if (headers) {
    changedData.unshift(headers);
  }
  var jsonObject = JSON.stringify(changedData);

  var csv = (jsonObject => {
    var array =
      typeof jsonObject != "object" ? JSON.parse(jsonObject) : jsonObject;
    var str = "";

    for (var i = 0; i < array.length; i++) {
      var line = "";
      for (var index in array[i]) {
        if (line != "") line += ",";

        line += array[i][index];
      }

      str += line + "\r\n";
    }

    return str;
  })(jsonObject);

  var exportedFilenmae =
    `coursedata${
      currentDay ? dt.dateToDateString(new Date()) : $("#dateSelection").val()
    }.csv` || "export.csv";

  var blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  if (navigator.msSaveBlob) {
    // IE 10+
    navigator.msSaveBlob(blob, exportedFilenmae);
  } else {
    var link = document.createElement("a");
    if (link.download !== undefined) {
      // feature detection
      // Browsers that support HTML5 download attribute
      var url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", exportedFilenmae);
      link.style.visibility = "hidden";
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
      if (propName == "HappendAt") {
        if (a[propName].getTime() !== b[propName].getTime()) return false;
      } else return false;
    }
  }
  return true;
}

//Testing
// $("#startButton").click();
