var currentData = [];
var historicalData = [];
var globalCounter = 0;
var allNames = [];
let containment = [];
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

    //To be replaced
    endTime = currentData[0].HappendAt;
    currentData
      .map(({ HappendAt }) => HappendAt)
      .forEach(HappendAt => {
        if (HappendAt > endTime) {
          endTime = HappendAt;
        }
      });
    slider.setAttribute("max", dateToSeconds(endTime));
    console.log(dateToSeconds(endTime));
    slider.setAttribute("value", dateToSeconds(endTime));
    console.log(slider);
    document.getElementById("now").innerHTML =
      endTime.getHours() +
      ":" +
      endTime.getMinutes() +
      ":" +
      endTime.getSeconds();

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
        return { qnLabel: QnLabel, code: Code, answer: Answer, HappendAt };
      });
    value.progress = [
      ...new Set(value.progress.map(({ qnLabel }) => qnLabel))
    ].map(qnLabel => value.progress.find(s => qnLabel == s.qnLabel));
  });
  arraySortString(namesTemp, "name");
  return namesTemp;
}

function dataArrayToQnLabel(array, time = endTime) {
  let newData = [...new Set(array.map(({ QnLabel }) => QnLabel))].map(
    QnLabel => {
      return { QnLabel, data: [] };
    }
  );
  newData.map(value => {
    value.data = array.filter(
      ({ QnLabel, HappendAt, Answer }) =>
        value.QnLabel == QnLabel && HappendAt <= time && Answer
    );
    value.data = [...new Set(value.data.map(({ Name }) => Name))].map(Name =>
      value.data.find(s => s.Name == Name)
    );
  });
  newData.sort((a, b) => {
    return a.QnLabel < b.QnLabel ? -1 : b.QnLabel < a.QnLabel ? 1 : 0;
  });
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

const ctx = document.getElementById("chart").getContext("2d");
const myChart = new Chart(ctx, {
  type: "horizontalBar",
  data: {},
  options: {
    maintainAspectRatio: false,
    scales: {
      xAxes: [
        {
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
  const labels = chartData.map(({ QnLabel }) => QnLabel);
  myChart.data = {
    labels,
    datasets: [
      {
        label: "# of Answer",
        data: chartData.map(({ data }) => data.length),
        backgroundColor: labels.map(() => random_bg_color()),
        borderColor: labels.map(() => random_bg_color()),
        borderWidth: 1
      }
    ]
  };
  myChart.update();
}

function random_bg_color() {
  var x = Math.floor(Math.random() * 256);
  var y = Math.floor(Math.random() * 256);
  var z = Math.floor(Math.random() * 256);
  var bgColor = "rgb(" + x + "," + y + "," + z + ")";
  return bgColor;
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

hideInputs = () => {
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
    sChart = false;
  } else {
    sChart = true;
    $("#chart").show();
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
    chartView(dataArrayToQnLabel(currentData, to));
    refreshView();
  }
};

//View
function switchView() {}

//Testing
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
