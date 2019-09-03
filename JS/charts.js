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
const groupDataByQnLabel = data => {
  let newData = [...new Set(data.map(({ QnLabel }) => QnLabel))].map(
    QnLabel => {
      return { QnLabel, data: [] };
    }
  );
  newData.map(value => {
    value.data = data.filter(({ QnLabel }) => value.QnLabel == QnLabel);
  });
  newData.sort((a, b) => {
    return a.QnLabel < b.QnLabel ? -1 : b.QnLabel < a.QnLabel ? 1 : 0;
  });
  return newData;
};
console.log(data);
console.log(groupDataByName(data));
console.log(groupDataByQnLabel(data));

var ctx = document.getElementById("myChart").getContext("2d");
var myChart = new Chart(ctx, {
  type: "bar",
  data: {
    labels: ["Red", "Blue", "Yellow", "Green", "Purple", "Orange"],
    datasets: [
      {
        label: "# of Votes",
        data: [12, 19, 3, 5, 2, 3],
        backgroundColor: [
          "rgba(255, 99, 132, 0.2)",
          "rgba(54, 162, 235, 0.2)",
          "rgba(255, 206, 86, 0.2)",
          "rgba(75, 192, 192, 0.2)",
          "rgba(153, 102, 255, 0.2)",
          "rgba(255, 159, 64, 0.2)"
        ],
        borderColor: [
          "rgba(255, 99, 132, 1)",
          "rgba(54, 162, 235, 1)",
          "rgba(255, 206, 86, 1)",
          "rgba(75, 192, 192, 1)",
          "rgba(153, 102, 255, 1)",
          "rgba(255, 159, 64, 1)"
        ],
        borderWidth: 1
      }
    ]
  },
  options: {
    scales: {
      yAxes: [
        {
          ticks: {
            beginAtZero: true
          }
        }
      ]
    }
  }
});

//Data Duplication check
const testArray = [
  { Name: "benny", QnLabel: "A1", HappendAt: "3" },
  { Name: "benny", QnLabel: "A1", HappendAt: "1" },
  { Name: "benny", QnLabel: "A2", HappendAt: "1" },
  { Name: "benny", QnLabel: "A1", HappendAt: "5" },
  { Name: "daniel", QnLabel: "A1", HappendAt: "1" },
  { Name: "benny", QnLabel: "A1", Answer: "answer", HappendAt: "2" }
];



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
console.log(newArray);
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
console.log(today);
console.log(secondsToDate(dateToSeconds(today))); // Test

slider.oninput = function() {
  document.getElementById("sliderOutput").innerHTML = formatTime(this.value);
};
