data.map(value => {
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

let startingTime = data[0].HappendAt;
data
  .map(({ HappendAt }) => HappendAt)
  .forEach(HappendAt => {
    if (HappendAt < startingTime) {
      startingTime = HappendAt;
    }
  });

//To be replaced
let endTime = data[0].HappendAt;
data
  .map(({ HappendAt }) => HappendAt)
  .forEach(HappendAt => {
    if (HappendAt > endTime) {
      endTime = HappendAt;
    }
  });

const groupDataByName = data => {
  const namesTemp = [...new Set(data.map(({ Name }) => Name))].map(Name => {
    return { name: Name, progress: [] };
  });
  namesTemp.map(value => {
    value.progress = data
      .filter(({ Name }) => value.name == Name)
      .map(({ QnLabel, Code, Answer }) => {
        return { qnLabel: QnLabel, code: Code, answer: Answer };
      });
  });
  namesTemp.sort((a, b) => {
    return a.name < b.name ? -1 : b.name < a.name ? 1 : 0;
  });
  return namesTemp;
};
const groupDataByQnLabel = (data, time) => {
  let newData = [...new Set(data.map(({ QnLabel }) => QnLabel))].map(
    QnLabel => {
      return { QnLabel, data: [] };
    }
  );
  newData.map(value => {
    value.data = data.filter(
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
};
// console.log(data);
// console.log(groupDataByName(data));
// console.log(groupDataByQnLabel(data, endTime));

function random_bg_color() {
  var x = Math.floor(Math.random() * 256);
  var y = Math.floor(Math.random() * 256);
  var z = Math.floor(Math.random() * 256);
  var bgColor = "rgb(" + x + "," + y + "," + z + ")";
  return bgColor;
}

let chartData = groupDataByQnLabel(data, endTime);
let chartInfo = {
  labels: [],
  datasets: [
    {
      label: "Apple",
      data: [],
      backgroundColor: [],
      borderColor: [],
      borderWidth: 1
    }
  ]
};
console.log(chartData);
chartInfo.labels = chartData.map(({ QnLabel }) => QnLabel);
chartInfo.data = chartData.map(({ data }) => data.length);
chartInfo.backgroundColor = chartInfo.labels.map(() => random_bg_color());
chartInfo.borderColor = chartInfo.labels.map(() => random_bg_color());

var ctx = document.getElementById("myChart").getContext("2d");
var myChart = new Chart(ctx, {
  type: "horizontalBar",
  data: {
    labels: chartInfo.labels,
    datasets: [
      {
        label: "# of Answer",
        data: chartInfo.data,
        backgroundColor: chartInfo.backgroundColor,
        borderColor: chartInfo.borderColor,
        borderWidth: 1
      }
    ]
  },
  options: {
    responsive: false,
    maintainAspectRatio: false,
    animation: {
      duration: 1,
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
            ctx.fillText(data, bar._model.x - 10, bar._model.y - 5);
          });
        });
      }
    },
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
    },
  }
});
// myChart.data.datasets.forEach(dataset => {
//   dataset.data = 1;
// });
// myChart.update();

//Data Duplication check
const testArray = [
  { Name: "benny", QnLabel: "A1", HappendAt: "3" },
  { Name: "benny", QnLabel: "A1", HappendAt: "1" },
  { Name: "benny", QnLabel: "A2", HappendAt: "1" },
  { Name: "benny", QnLabel: "A1", HappendAt: "5" },
  { Name: "daniel", QnLabel: "A1", HappendAt: "1" },
  { Name: "benny", QnLabel: "A1", Answer: "answer", HappendAt: "2" }
];

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

// console.log(arraySortString(data, "Name"));

testArray.sort((a, b) => new Date(b.HappendAt) - new Date(a.HappendAt));
const newArray = [...new Set(testArray.map(({ Name }) => Name))].map(
  GroupName => {
    return {
      Name: GroupName,
      progress: []
    };
  }
);
newArray.map(value => {
  let holder = testArray
    .filter(({ Name }) => value.Name == Name)
    .map(({ QnLabel, Answer, HappendAt }) => {
      return { QnLabel, Answer, HappendAt };
    });
  holder = [...new Set(holder.map(({ QnLabel }) => QnLabel))].map(QnLabel =>
    holder.find(s => QnLabel == s.QnLabel)
  );
  value.progress = holder;
});
// console.log(newArray);
// [...new Set(currentData.map(({ Name, QnLabel })))]

//Slider
var slider = document.getElementById("myRange");
let today = new Date("2019-08-21T08:52:24.0545633");
const STARTINGTIME = new Date("2019-08-21T06:29:34.9166681"); //Input Array Start
slider.setAttribute("min", dateToSeconds(STARTINGTIME));
slider.setAttribute("max", dateToSeconds(today));
document.getElementById("sliderOutput").innerHTML = formatTimeToHTML(
  STARTINGTIME
);

document.getElementById("now").innerHTML =
  today.getHours() + ":" + today.getMinutes() + ":" + today.getSeconds();

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
// console.log(today);
// console.log(secondsToDate(dateToSeconds(today))); // Test

slider.oninput = function() {
  document.getElementById("sliderOutput").innerHTML = formatTime(this.value);
};
