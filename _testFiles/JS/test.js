const dbRootURL = "https://dxsurvey.com/api/MySurveys/getSurveyResults/",
  // dbID = "89c190aa-9d8b-4d34-af41-61f602d54a9b", //OG
  dbID = "2d109f03-72d2-4cd1-bcd2-e5e028c06ca9", //Copy
  dbaccessKey = "4d09c11a98484a91b9182b2f6bff76c9";

function getData() {
  console.log("Getting Data");
  $.ajax({
    type: "GET",
    url: `${dbRootURL + dbID}?accessKey=${dbaccessKey}`,
    dataType: "json"
  })
    .done(value => {
      console.log("Successful");
      console.log(value);
    })
    .fail((jqXHR, textStatus, errorThrown) => {
      console.log(errorThrown);
    });
}

function sendData() {
  $.ajax({
    type: "POST",
    url: "https://dxsurveyapi.azurewebsites.net/api/Survey/post/",
    data: {
      postId: "4ef0c037-a54a-4a3c-86ef-312cd48737bf",
      surveyResult: JSON.stringify({
        Code: "",
        QnLabel: "A6",
        Name: "Benny",
        Answer: "I think question is invalid"
      })
    },
    success: () => {
      console.log("send");
    }
  });
}
