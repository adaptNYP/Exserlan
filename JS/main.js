var currentData = [];
var historicalData = [];
var globalCounter = 0;
var allNames = [];
var timer;
const TIMER_PERIOD = 5000;
var autoRefresh = true;
var clicks = 0;
var clickTimer = null;
var DOUBLECLICK_DELAY = 300; //300 Milliseconds, 0.3 seconds
var firstDataReceived = false;
var firstDataInterval = null;
let sortNameBy = "desc";

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
  // Sorting (Useless)
  currentRes.Data.sort((a, b) => new Date(a.HappendAt) - new Date(b.HappendAt)); //Accending Date
  //   currentRes.Data.sort((a, b) => (a.Name > b.Name ? -1 : b.Name > a.Name ? 1 : 0)); //Decending Name

  currentData = currentRes.Data.slice(globalCounter); //Is it even neccessary to put the slice

  var newCounter = currentRes.Data.length;

  if (globalCounter < newCounter) {
    globalCounter = newCounter;
    // Group According to Names
    const namesTemp = [...new Set(currentData.map(({ Name }) => Name))].map(
      Name => {
        return { name: Name, progress: [] };
      }
    );
    namesTemp.forEach((value, index) => {
      namesTemp[index].progress = currentData
        .filter(({ Name }) => value.name == Name)
        .map(({ QnLabel, Code, Answer }) => {
          return { qnLabel: QnLabel, code: Code, answer: Answer };
        });
    });
    namesTemp.sort((a, b) => {
      return a.name < b.name ? -1 : b.name < a.name ? 1 : 0;
    });
    historicalData = namesTemp;
    refreshView();
  }
}

var refreshView = () => {
  document.getElementById("studentsProgress").innerHTML = "";

  if ("content" in document.createElement("template")) {
    for (var k = 0; k < historicalData.length; k++) {
      // Instantiate the div with the existing HTML tbody
      // and the row with the template
      var studentTemplate = document.querySelector("#studentTemplate");

      // Clone the new row and insert it into the table
      var studentRow = document.importNode(studentTemplate.content, true);
      studentRow.querySelector(".studentName").innerHTML =
        historicalData[k].name;
      var thisStudentProgress = historicalData[k].progress;

      for (var t = 0; t < thisStudentProgress.length; t++) {
        var cellTemplate = document.querySelector("#cellTemplate");
        var cloneCell = document.importNode(cellTemplate.content, true);

        //assign student name to cell
        cloneCell.querySelector(".progressCell").dataset.name =
          historicalData[k].name;

        // prepare cell with data from qnLabel
        cloneCell.querySelector(".progressCell").innerHTML =
          thisStudentProgress[t].qnLabel;
        cloneCell.querySelector(".progressCell").dataset.qnLabel =
          thisStudentProgress[t].qnLabel;

        // prepare cell with indices from historicalData and thisStudentProgress
        cloneCell.querySelector(".progressCell").dataset.indexHist = k;
        cloneCell.querySelector(".progressCell").dataset.indexProg = t;

        // Prepare class according to first character of QnLabel in data
        // Possible values = uppercase alphabet
        var currentCellClass;
        if (thisStudentProgress[t].qnLabel.charAt(0) == "A")
          currentCellClass = "classA";
        else if (thisStudentProgress[t].qnLabel.charAt(0) == "B")
          currentCellClass = "classB";
        else if (thisStudentProgress[t].qnLabel.charAt(0) == "C")
          currentCellClass = "classC";
        else if (thisStudentProgress[t].qnLabel.charAt(0) == "D")
          currentCellClass = "classD";

        // prepare cell with classes
        cloneCell
          .querySelector(".progressCell")
          .classList.add(currentCellClass);

        // Prepare class according to code in data
        // Possible values: codeRed, codeGreen, codeOrange
        if (!(typeof thisStudentProgress[t].code === "undefined")) {
          cloneCell
            .querySelector(".progressCell")
            .classList.add(thisStudentProgress[t].code);
          //prepare cells with dataset
          cloneCell.querySelector(".progressCell").dataset.code =
            thisStudentProgress[t].code;
        }

        // Prepare class according to feedback in data
        if (!(typeof thisStudentProgress[t].answer === "undefined")) {
          //prepare cells with classes
          cloneCell
            .querySelector(".progressCell")
            .classList.add("feedbackCell");
          //prepare cells with dataset
          cloneCell.querySelector(".progressCell").dataset.answer =
            thisStudentProgress[t].answer;
        }

        // Prepare class according to resolved status in data
        if (!(typeof thisStudentProgress[t].resolved === "undefined")) {
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
      }
      document.getElementById("studentsProgress").appendChild(studentRow);
    }
  } else {
    console.log("Template doesn't work");
    // Find another way to add the rows to the table because
    // the HTML template element is not supported.
  }
};

const sortName = () => {
  if (sortNameBy == "desc") {
    sortNameBy = "asc";
    historicalData.sort((a, b) => {
      return a.name > b.name ? -1 : b.name << a.name ? 1 : 0;
    });
  } else if (sortNameBy == "asc") {
    sortNameBy = "desc";
    historicalData.sort((a, b) => {
      return a.name < b.name ? -1 : b.name < a.name ? 1 : 0;
    });
  }
  refreshView();
};

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

//Testing
hideInputs();
checkForFirstDataStream();

function exportToJsonFile() {
    let dataStr = JSON.stringify(currentData);
    let dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    let exportFileDefaultName = 'data.json';
    let linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
}