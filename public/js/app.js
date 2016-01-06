$(function(){
  T.init();
  $(".duplicate").on("submit", T.duplicateBoard);
});

var T = T || {};

T.init = function(){
  Trello.authorize({
    interactive: true,
    type: "popup",
    name: "bulk-card-mover",
    scope: {
      read: true,
      write: true
    },
    expiration: "never",
    persist: "true",
    success: function() { T.onAuthorizeSuccessful(); },
    error: function() { T.onFailedAuthorization(); },
  });
};

T.onAuthorizeSuccessful = function() {
  var token = Trello.token();
  return T.getBoards();
};

T.onFailedAuthorization = function() {
  return console.log("Authorization failed.");
};

T.getBoards = function(){
  return Trello.get("/members/me/boards?filter=open").done(function(data){
    return data.forEach(function(board) {
      $(".boards").prepend("<option value='"+ board.id +"'>"+ board.name +"</option>");
    });
  }).fail(function(data) {
    return console.log(data);
  });
};

T.duplicateBoard = function(){
  event.preventDefault();
  var name           = $("#name").val();
  var idBoardSource  = $("#idBoardSource").val();
  var oldStartDate   = $("#old-start-date").val();
  var newStartDate   = $("#new-start-date").val();
  var dayDifference  = T.dayDifference(oldStartDate, newStartDate);

  $(".message").text("Duplicating board...");
  return Trello.post("/boards", {
    name: name,
    idBoardSource: idBoardSource
  }).done(function(data){
    $(".message").text("Board data recieved.");
    return T.moveCards(data.id, dayDifference);
  }).fail(function(data){
    return console.log(data);
  });
};

T.moveCards = function(id, dayDifference){
  $(".message").text("Fetching cards.");

  Trello.get("/boards/"+id+"/cards").done(function(data) {
    var numberOfCards = data.length;
    $(".message").text(numberOfCards + " cards found");

    data.forEach(function(card, index) {
      // Delay for rate limiting, 100 calls per 10 seconds
      // - http://help.trello.com/article/838-api-rate-limits
      setTimeout(function(){
        numberOfCards--;

        if (card.due) {
          var newDate = T.createNewDate(card.due, dayDifference);
          Trello.put("/cards/"+card.id+"/due", { value: newDate }).done(function(data) {
            $(".message").text(numberOfCards + " cards remaining");
            if (numberOfCards === 0) return $(".message").text("Complete!");
          }).fail(function(data){
            return console.log(data);
          });
        }
      }, 100*index);
    });
  });
};

T.dayDifference = function(oldStartDate, newStartDate){
  // Number of milliseconds in a day
  var oneDay = 24*60*60*1000;

  // Calculate the number of days between course start dates
  var date1  = new Date(oldStartDate);
  var date2  = new Date(newStartDate);
  return Math.round(Math.abs((date1.getTime() - date2.getTime())/(oneDay)));
};

T.createNewDate = function(dueOriginally, dayDifference) {
  // Convert old date into a Date object
  var newDate = new Date(dueOriginally);

  // Set new date and account for change in Datetime
  return newDate.setDate(newDate.getDate() + dayDifference);
};
