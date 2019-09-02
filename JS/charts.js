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
