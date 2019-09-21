const LSK = "keys"; //Local Storage Key
const REFRESH_DATA_RATE = 1000; // 1s

var dbID = $("#surveyJSDBid").val();
var dbaccessKey = $("#surveyJSDBaccessKey").val();
let slider = document.getElementById("myRange");

let refreshInterval;

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

$("#stopButton").click(() => clearInterval(refreshInterval));

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
        (function addingKey(dbID, dbaccessKey) {
          let keyArray = JSON.parse(window.localStorage.getItem(LSK));
          if (!keyArray) keyArray = [];
          if (
            !keyArray.find(
              key => key.dbID == dbID && key.dbaccessKey == dbaccessKey
            )
          ) {
            keyArray.push({ dbID, dbaccessKey });
            window.localStorage.setItem(LSK, JSON.stringify(keyArray));
            loadIDHolder();
          }
        })(dbID, dbaccessKey);
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
  let refreshLimit = {
    limit: 5,
    restart: () => (this.limit = 5)
  };
  runningRefresh();
  refreshInterval = setInterval(() => {
    let oldDataLength = [...data.ajaxData].length;
    data
      .getData(dbID, dbaccessKey)
      .then(({ length }) => {
        refreshLimit.restart();
        if (oldDataLength != length) runningRefresh();
      })
      .catch(() => refreshLimit.limit--);
    if (refreshLimit == 0) {
      clearInterval(refreshInterval);
      alert("Refeshlimit hit, error with connection");
      $(".firstPage").show();
    }
  }, REFRESH_DATA_RATE);
}

//Main function for running
function runningRefresh() {
  data.mainSort();
}

function changeDate(evt) {
  console.log(evt.options[evt.selectedIndex].text);
}

const data = new (class {
  dbRootURL = "https://dxsurvey.com/api/MySurveys/getSurveyResults/";
  ajaxData = []; //All Data
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
    let d = this.ajaxData;
    d.map(value => (value.HappendAt = new Date(value.HappendAt)));
    d.sort((a, b) => new Date(b.HappendAt) - new Date(a.HappendAt));
    let uniqueDates = [
      ...new Set(
        d.map(
          ({ HappendAt }) =>
            `${HappendAt.getFullYear()}-${HappendAt.getMonth()}-${HappendAt.getDate()}`
        )
      )
    ];
    $("#dateSelection").html(
      uniqueDates.map(d => `<option>${d}</option>`).reduce((a, b) => a + b)
    );
    let t = new Date();
    this.dayData = this.arrayToDate(d, new Date(uniqueDates[0]));
    if (uniqueDates[0] != `${t.getFullYear()}-${t.getMonth()}-${t.getDate()}`) {
      clearInterval(refreshInterval); //Don't run interval if user day is not at current date
      this.dayEndTime = d[0].HappendAt;
    } else {
    }
    this.setUp(this.dayData);
  }
  setUp(d) {
    slider.setAttribute("min", dt.dateToSeconds(d[d.length - 1].HappendAt));
    slider.setAttribute("max", dt.dateToSeconds(this.dayEndTime));
    slider.setAttribute("value", dt.dateToSeconds(this.dayEndTime)); //To be removed
    $("#now").html(dt.dateToString(this.dayEndTime)); //Check if date got issue
    $("#sliderOutput").html(dt.dateToString(this.dayEndTime));
    this.dataNewTime(this.dayEndTime);
  }
  dataNewTime(date) {
    this.nameArray = this.arrayByNames(this.dayData, date);
    this.qnLabelArray = this.arrayByQnLabel(this.dayData, date);
  }
  arrayToDate(a, date) {
    return a.filter(
      ({ HappendAt }) =>
        HappendAt.getFullYear() == date.getFullYear() &&
        HappendAt.getMonth() == date.getMonth() + 1 &&
        HappendAt.getDate() == date.getDate()
    );
  }
  arrayByNames(a, time = new Date()) {
    return this.stringDesc(
      [...new Set(a.map(({ Name }) => Name))].map(name => {
        let c = a.filter(
          ({ Name, HappendAt }) => name == Name && HappendAt <= time
        );
        return {
          name,
          progress: this.stringDesc(
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
    return this.stringDesc(
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
  stringDesc(a, object) {
    return a.sort((a, b) => {
      return a[object] < b[object] ? -1 : b[object] < a[object] ? 1 : 0;
    });
  }
})();

const dt = new (class {
  dateToSeconds(date = new Date()) {
    return date.getSeconds() + date.getMinutes() * 60 + date.getHours() * 3600;
  }
  // getSeconds(seconds = 0, minutes = 0, hours = 0) {
  //   return hours * 60 * 60 + minutes * 60 + seconds;
  // }
  dateToString(date) {
    return `${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}`;
  }
  formatTime(s) {
    let seconds = s % 60;
    let hours = Math.trunc(s / 60 / 60);
    let minutes = (s - hours * 60 * 60 - seconds) / 60;
    return `${hours}:${minutes}:${seconds}`;
  }
  formatTimeToHTML(date = new Date()) {
    return date.getHours() + ":" + date.getMinutes() + ":" + date.getSeconds();
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

//Testing
$("#startButton").click();
