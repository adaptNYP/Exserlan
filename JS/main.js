var currentData = [];
var historicalData = [];
var globalCounter = 0;
var allNames = [];
let containment = [];
let globalChartData = [];
var timer;
const TIMER_PERIOD = 5000;
var autoRefresh = true;
var clicks = 0;
var clickTimer = null;
var DOUBLECLICK_DELAY = 300; //300 Milliseconds, 0.3 seconds
var firstDataReceived = false;
var firstDataInterval = null;
let sortNameBy = "desc";
let today = new Date("2019-08-21T08:52:24.0545633"); //To be changed without inputs
let startingTime = new Date(),
  endTime = new Date();

let running = false;
let resolvedArray = [];

let slider = document.getElementById("myRange");

const INITIAL_RUNNING_MSG = "Click on 'Stop' to terminate the app.";
const TOGGLE_RUNNING_MSG =
  "Data is in! You can toggle between manual or auto refresh.";

// Get the <span> element that closes the modal
var span = document.getElementsByClassName("close")[0];

// Get the modal
var modal = document.getElementById("myModal");

// When the user clicks on <span> (x), close the modal
span.onclick = () => (modal.style.display = "none");

// When the user clicks anywhere outside of the modal, close it
window.onclick = event =>
  event.target == modal ? (modal.style.display = "none") : "";

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
  if (!autoRefresh) {
    if ($(this).hasClass("codeOrange") || $(this).hasClass("codeRed")) {
      // add class to change border style of cell
      $(this).addClass("resolved");

      var indexHist = this.getAttribute("data-index-hist");
      var indexProg = this.getAttribute("data-index-prog");

      var thisStudentProgress = historicalData[indexHist].progress;
      thisStudentProgress[indexProg].resolved = 1;
    }
  }
}

function checkForFirstDataStream() {
  $("#studentsProgress").html("<p>Awaiting input...</p>");
  firstDataInterval = setInterval(worker, TIMER_PERIOD);
}

function worker() {
  // Retrieve data from database
  var currentRes = (() => {
    var tmp = null;
    var dbRootURL = "https://dxsurvey.com/api/MySurveys/getSurveyResults/";
    var dbID = $("#surveyJSDBid").val();
    var dbaccessKey = $("#surveyJSDBaccessKey").val();

    // remove after testing
    dbID = "89c190aa-9d8b-4d34-af41-61f602d54a9b";
    // dbID = "2d109f03-72d2-4cd1-bcd2-e5e028c06ca9";
    dbaccessKey = "4d09c11a98484a91b9182b2f6bff76c9";

    $.ajax({
      async: false,
      type: "GET",
      url: dbRootURL + dbID + "?accessKey=" + dbaccessKey,
      dataType: "json",
      success: data => {
        tmp = data;
        if (tmp.Data.length != 0 && !firstDataReceived) {
          firstDataReceived = true;
          clearInterval(firstDataInterval);
          $("#toggleMode")
            .on("click", toggleRefreshMode)
            .removeClass("btn-default")
            .addClass("btn-info")
            .html("Manual now");
          $("#runningMsg").html(
            `${INITIAL_RUNNING_MSG}<br>${TOGGLE_RUNNING_MSG}`
          );
          autoRefresh = false;
          $("#manualRefreshBtn").show();
          $(".dataButtons").show();
        }
      },
      complete: () => {
        // Schedule the next request when the current one's complete
        console.log("Retrieved from database");
        console.log(autoRefresh);
        if (autoRefresh) timer = setTimeout(worker, TIMER_PERIOD); //Calls only once
      }
    });
    return tmp;
  })();
  // currentRes.Data.sort((a, b) => new Date(a.HappendAt) - new Date(b.HappendAt)); //Accending Date

  currentData = [...new Set(currentRes.Data.slice(globalCounter))]; //Is it even neccessary to put the slice

  var newCounter = currentRes.Data.length;

  if (globalCounter < newCounter) {
    globalCounter = newCounter;

    //Remove Date only leave time //Remove after testing
    currentData.map(value => {
      const date = new Date(value.HappendAt);
      value.HappendAt = new Date(
        2019,
        7,
        21,
        date.getHours(),
        date.getMinutes(),
        date.getSeconds()
      );
    });

    startingTime = currentData[0].HappendAt;
    currentData
      .map(({ HappendAt }) => HappendAt)
      .forEach(HappendAt => {
        if (HappendAt < startingTime) {
          startingTime = HappendAt;
        }
      });
    slider.setAttribute("min", dateToSeconds(startingTime));

    //To be replaced with current time
    endTime = currentData[0].HappendAt;
    currentData
      .map(({ HappendAt }) => HappendAt)
      .forEach(HappendAt => {
        if (HappendAt > endTime) {
          endTime = HappendAt;
        }
      });
    slider.setAttribute("max", dateToSeconds(endTime));
    slider.setAttribute("value", dateToSeconds(endTime));
    document.getElementById(
      "now"
    ).innerHTML = `${endTime.getHours()}:${endTime.getMinutes()}:${endTime.getSeconds()}`;
    document.getElementById("sliderOutput").innerHTML = formatTimeToHTML(
      endTime
    );

    //Sort Desc
    currentData.sort((a, b) => new Date(b.HappendAt) - new Date(a.HappendAt));

    // Group According to Names
    historicalData = dataArrayToNames(currentData);
    containment = historicalData.concat(); //global
    const chartData = dataArrayToQnLabel(currentData);

    // Format Chart Max Value
    myChart.options.scales.xAxes[0].ticks.suggestedMax = Math.max(
      ...chartData.map(({ data }) => data.length)
    );
    myChart.update();
    globalChartData = chartData;
    //Display
    chartView(chartData);
    refreshView();
  }
}

function dataArrayToNames(array, time = endTime) {
  const namesTemp = [...new Set(array.map(({ Name }) => Name))].map(
    GroupName => {
      return {
        name: GroupName,
        progress: []
      };
    }
  );
  namesTemp.map(value => {
    value.progress = array
      .filter(({ Name, HappendAt }) => value.name == Name && HappendAt <= time)
      .map(({ QnLabel, Code, Answer, HappendAt }) => {
        return {
          qnLabel: QnLabel,
          code: Code,
          answer: Answer,
          happendAt: HappendAt
        };
      });
    value.progress = [...new Set(value.progress.map(({ qnLabel }) => qnLabel))]
      .map(qnLabel => value.progress.find(s => qnLabel == s.qnLabel))
      .sort((a, b) => {
        return a.qnLabel < b.qnLabel ? -1 : b.qnLabel < a.qnLabel ? 1 : 0;
      });
  });
  arraySortString(namesTemp, "name");
  return namesTemp;
}

function dataArrayToQnLabel(array, time = endTime) {
  let newData = [...new Set(array.map(({ QnLabel }) => QnLabel))].map(
    QnLabel => {
      return { QnLabel, data: [], type: "" }; //MCQ & Free response/MCQ Traffic light(Code no answer)/Milestones(No Code no Answer)
    }
  );
  newData.map(value => {
    value.data = array.filter(
      ({ QnLabel, HappendAt }) => value.QnLabel == QnLabel && HappendAt <= time
    );
    value.data = [...new Set(value.data.map(({ Name }) => Name))].map(Name =>
      value.data.find(s => s.Name == Name)
    );
    if (!value.data.find(s => s.Code)) value.type = "MS";
    else if (!value.data.find(s => s.Answer)) value.type = "TL";
  });
  newData.sort((a, b) => {
    return a.QnLabel < b.QnLabel ? -1 : b.QnLabel < a.QnLabel ? 1 : 0;
  });
  console.log(newData);
  return newData;
}

function arraySortString(array, name, ascdesc = "desc") {
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

function refreshView() {
  document.getElementById("studentsProgress").innerHTML = "";

  if ("content" in document.createElement("template")) {
    historicalData.forEach(({ name, progress }, indexHist) => {
      // Instantiate the div with the existing HTML tbody
      // and the row with the template
      var studentTemplate = document.querySelector("#studentTemplate");

      // Clone the new row and insert it into the table
      var studentRow = document.importNode(studentTemplate.content, true);
      studentRow.querySelector(".studentName").innerHTML = name;

      progress.forEach(({ qnLabel, answer, code, resolved }, indexProg) => {
        var cellTemplate = document.querySelector("#cellTemplate");
        var cloneCell = document.importNode(cellTemplate.content, true);

        //assign student name to cell
        cloneCell.querySelector(".progressCell").dataset.name = name;
        // prepare cell with data from qnLabel
        cloneCell.querySelector(".progressCell").innerHTML = qnLabel;
        cloneCell.querySelector(".progressCell").dataset.qnLabel = qnLabel;

        // prepare cell with indices from historicalData and thisStudentProgress
        cloneCell.querySelector(".progressCell").dataset.indexHist = indexHist;
        cloneCell.querySelector(".progressCell").dataset.indexProg = indexProg;

        // prepare cell with classes
        cloneCell.querySelector(".progressCell").classList.add(
          (() =>
            // Prepare class according to first character of QnLabel in data
            // Possible values = uppercase alphabet
            ["A", "B", "C", "D"]
              .filter(value => value == qnLabel.charAt(0))
              .map(value => `class${value}`)[0])()
        );

        // Prepare class according to code in data
        // Possible values: codeRed, codeGreen, codeOrange
        if (!(typeof code === "undefined")) {
          cloneCell.querySelector(".progressCell").classList.add(code);
          //prepare cells with dataset
          cloneCell.querySelector(".progressCell").dataset.code = code;
        }

        // Prepare class according to feedback in data
        if (!(typeof answer === "undefined")) {
          //prepare cells with classes
          cloneCell
            .querySelector(".progressCell")
            .classList.add("feedbackCell");
          //prepare cells with dataset
          cloneCell.querySelector(".progressCell").dataset.answer = answer;
        }

        // Prepare class according to resolved status in data
        if (!(typeof resolved === "undefined")) {
          //prepare cells with classes
          cloneCell.querySelector(".progressCell").classList.add("resolved");
        }
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
  } else {
    console.log("Template doesn't work");
    // Find another way to add the rows to the table because
    // the HTML template element is not supported.
  }
}

// Chart
const ctx = document.getElementById("chart").getContext("2d");
const myChart = new Chart(ctx, {
  type: "horizontalBar",
  data: {},
  options: {
    aspectRatio: 1,
    maintainAspectRatio: false,
    onResize: () => {
      console.log("asdasd");
    },
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
            if (data != 0)
              ctx.fillText(data, bar._model.x - 10, bar._model.y - 5);
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

let chartInfo = "name";
function chartInfoToggle() {
  if (chartInfo == "name") {
    $("#chartToggle").html("Toggle List By Answer");
    chartInfo = "answer";
    refreshChartInfo();
  } else {
    $("#chartToggle").html("Toggle List By Name");
    chartInfo = "name";
    refreshChartInfo();
  }
}

let currentChartLabel = "";
let chartInfos = [];
document.getElementById("chart").onclick = function(evt) {
  var activePoints = myChart.getElementsAtEvent(evt);
  if (activePoints.length > 0) {
    var clickedElementindex = activePoints[0]["_index"];
    var label = myChart.data.labels[clickedElementindex];
    currentChartLabel = label;

    const progressQNData = historicalData
      .map(user => {
        progressQN = user.progress.filter(
          ({ qnLabel, answer }) => label == qnLabel && answer
        )[0];
        let { answer, code, qnLabel, happendAt, resolved } = progressQN;
        if (progressQN)
          return {
            name: user.name,
            answer,
            code,
            qnLabel,
            happendAt,
            resolved
          };
      })
      .filter(value => value);

    modal.querySelector(".modal-header h2").innerHTML = label;
    chartInfos = progressQNData;
    refreshChartInfo();
  }
};
function refreshChartInfo() {
  togglePieChart = false;
  $(".modal-body").removeClass("zeroPadding");
  let message = "";
  if (chartInfo == "name") {
    message = `
      <div class="row" style="font-weight: bold;text-align: center;">
          <div class="col-4 breakword">Name</div>
          <div class="col-6 breakword">Answer</div>
          <div class="col-2 breakword">UR</div>
      </div>`;
    chartInfos.map((value, index) => {
      message += `
      <hr>
      <div class="row" style="font-size: 0.8em;">
        <div class="col-4 breakword tableCenter">${value.name}</div>
        <div class="col-6 breakword tableCenter">${value.answer}</div>
        <div class="col-2 breakword" style="display: flex;">
          <div data-index ="${index}" onclick="tableResolve(this)" class="${
        value.code == "codeGreen"
          ? "tableGreen"
          : value.code == "codeRed"
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
    [...new Set(chartInfos.map(({ answer }) => answer))]
      .map(uniqueanswer => {
        return {
          number: chartInfos.filter(({ answer }) => answer == uniqueanswer)
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
  modal.style.display = "block";
  $(".chartButton").show();
}

function chartView(chartData) {
  chartData = chartData.filter(value => value.data.length != 0);
  let green = [],
    orange = [],
    red = [],
    grey = [],
    codeGreen = [],
    codeOrange = [],
    codeRed = [];

  chartData.forEach(({ data, type }) => {
    if (type == "MS") {
      green.push(0),
        red.push(0),
        grey.push(data.length),
        codeGreen.push(0),
        codeOrange.push(0),
        codeRed.push(0);
    } else {
      green.push(
        data.filter(({ Code, Answer }) => Code == "codeGreen" && Answer).length
      );
      red.push(
        data.filter(({ Code, Answer }) => Code == "codeRed" && Answer).length
      );
      grey.push(0);
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
        data: grey
      }
    ]
  };
  myChart.update();
}

function getLabelColor(QnLabel) {
  return (() => {
    switch (QnLabel.charAt(0)) {
      case "A":
        return "#ffccff";
      case "B":
        return "lightyellow";
      case "C":
        return "lightblue";
      case "D":
        return "#ccff99";
    }
  })();
}

function sortName() {
  if (sortNameBy == "desc") {
    arraySortString(historicalData, "name", "asc");
    sortNameBy = "asc";
  } else if (sortNameBy == "asc") {
    arraySortString(historicalData, "name");
    sortNameBy = "desc";
  }
  refreshView();
}

function hideInputs() {
  $("#landingJumbo").hide();
  $("#appRunningJumbo").show();
  $("#toggleMode")
    .off("click", toggleRefreshMode)
    .removeClass("btn-info btn-danger")
    .addClass("btn-default")
    .html("Waiting...");
  autoRefresh = false;
  $("#manualRefreshBtn").hide();
  $(".dataButtons").hide();
};

function clearTimer() {
  clearTimeout(timer);
  $("#landingJumbo").show();
  $("#appRunningJumbo").hide();
  $("#toggleMode")
    .off("click", toggleRefreshMode)
    .removeClass("btn-info btn-danger")
    .addClass("btn-default")
    .html("Waiting...");
  autoRefresh = false;
  $("#manualRefreshBtn").hide();
  $(".dataButtons").hide();
  currentData = [];
  historicalData = [];
  containment = [];
  globalCounter = 0;
  allNames = [];
  clicks = 0;
  firstDataReceived = false;
  $("#runningMsg").text(INITIAL_RUNNING_MSG);
}

function toggleRefreshMode() {
  if ($("#toggleMode").hasClass("btn-danger")) {
    $("#toggleMode")
      .removeClass("btn-danger")
      .addClass("btn-info")
      .html("Manual now");
    autoRefresh = false;
    $("#manualRefreshBtn").show();
    $(".dataButtons").show();
  } else {
    $("#toggleMode")
      .removeClass("btn-info")
      .addClass("btn-danger")
      .html("Auto now");
    autoRefresh = true;
    worker();
    $("#manualRefreshBtn").hide();
    $(".dataButtons").hide();
  }
}

let sChart = false;
function showChart() {
  if (sChart) {
    $("#chart").hide();
    $(".chartHeight").hide();
    sChart = false;
  } else {
    sChart = true;
    $("#chart").show();
    $(".chartHeight").show();
  }
}

let togglePieChart = false;
function pieChartToggle() {
  if (!togglePieChart) {
    togglePieChart = true;
    modal.querySelector(
      ".modal-body"
    ).innerHTML = `<canvas id="piechart"></canvas>`;
    $(".modal-body").addClass("zeroPadding");

    const piectx = document.getElementById("piechart").getContext("2d");

    const uniqueanswer = [...new Set(chartInfos.map(({ answer }) => answer))];
    console.log(uniqueanswer);
    let answers = uniqueanswer
      .map(uniqueanswer => {
        return {
          number: chartInfos.filter(({ answer }) => answer == uniqueanswer)
            .length,
          uniqueanswer,
          code: chartInfos.find(s => s.answer == uniqueanswer).code
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
        backgroundColor: answers.map(({ code }, index) => {
          if (code == "codeGreen") return "#4baea0";
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
    refreshChartInfo();
  }
}

//Slider Functions
function dateToSeconds(date = new Date()) {
  return getSeconds(date.getSeconds(), date.getMinutes(), date.getHours());
}
function getSeconds(seconds = 0, minutes = 0, hours = 0) {
  return hours * 60 * 60 + minutes * 60 + seconds;
}
function formatTime(s) {
  seconds = s % 60;
  hours = Math.trunc(s / 60 / 60);
  minutes = (s - hours * 60 * 60 - seconds) / 60;
  return `${hours}:${minutes}:${seconds}`;
}
function formatTimeToHTML(date = new Date()) {
  return date.getHours() + ":" + date.getMinutes() + ":" + date.getSeconds();
}
function secondsToDate(s) {
  seconds = s % 60;
  hours = Math.trunc(s / 60 / 60);
  minutes = (s - hours * 60 * 60 - seconds) / 60;
  return new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
    hours,
    minutes,
    seconds
  );
}

slider.oninput = function() {
  document.getElementById("sliderOutput").innerHTML = formatTime(this.value);
  if (currentData) {
    const to = secondsToDate(this.value);
    historicalData = dataArrayToNames(currentData, to);
    globalChartData = dataArrayToQnLabel(currentData, to);
    chartView(globalChartData);
    refreshView();
  }
};

//View
function switchView() {}

//Testing //Remove after testing
hideInputs();
checkForFirstDataStream();

function exportToJsonFile() {
  let dataStr = JSON.stringify(currentData);
  let dataUri =
    "data:application/json;charset=utf-8," + encodeURIComponent(dataStr);
  let exportFileDefaultName = "data.json";
  let linkElement = document.createElement("a");
  linkElement.setAttribute("href", dataUri);
  linkElement.setAttribute("download", exportFileDefaultName);
  linkElement.click();
}

function exportToCSV() {
  const changedData = currentData.map(value => {
    return {
      Name: value.Name,
      QnLabel: value.QnLabel,
      Answer: value.Answer ? value.Answer : "",
      Code: value.Code ? value.Code : "",
      HappendAt: value.HappendAt
    };
  });
  const headers = {
    Name: "Name",
    QnLabel: "QnLabel",
    Answer: "Answer",
    Code: "Code",
    HappendAt: "HappendAt"
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

  var exportedFilenmae = "coursedata  " + ".csv" || "export.csv";

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

function tableResolve(event) {
  const index = $(event).data("index");
  const data = chartInfos[index];
  console.log(data);
  if (!data.resolved) {
    if (data.code == "codeRed")
      $(event)
        .removeClass("tableUnresolvedRed")
        .addClass("tableResolvedRed");
    else if (data.code == "codeOrange")
      $(event)
        .removeClass("tableUnresolvedOrange")
        .addClass("tableResolveddOrange");
    else if (data.code == "codeGreen") return;
    if (running) {
      data.happendAt = new Date();
      resolvedArray.push(data);
    } else
      for (i = 0; i < historicalData.length; i++) {
        if (historicalData[i].name == data.name) {
          for (y = 0; y < historicalData[i].progress.length; y++) {
            const progress = historicalData[i].progress[y];
            if (
              progress.qnLabel == data.qnLabel &&
              progress.happendAt == data.happendAt
            )
              progress.resolved = true;
          }
          break;
        }
      }
  }
}
