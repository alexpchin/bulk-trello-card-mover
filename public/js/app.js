var T = T || {};

$(function(){
  T.init();
});

T.init = function(){
  T.loggedInStatus();
  $('input[name="name"], label[for="name"]').hide();
  $('input:radio[name="new"]').change(T.newBoard);
  $(".duplicate").on("submit", T.duplicateBoard);
  $(".login").on("submit", T.authorize);
};

T.newBoard = function(){
  if (this.checked && this.value == 'yes') {
    return $('input[name="name"]').show();
  } else {
    return $('input[name="name"]').hide();
  }
};

T.loggedInStatus = function(){
  var token      = Trello.token();
  var $loggedIn  = $(".logged-in");
  var $loggedOut = $(".logged-out");
  if (token) {
    $loggedOut.hide();
    $loggedIn.fadeIn();
  } else {
    $loggedIn.hide();
    $loggedOut.fadeIn();
  }
};

T.authorize = function(){
  event.preventDefault();
  return Trello.authorize({
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
    error: function() { T.error(); },
  });
};

T.onAuthorizeSuccessful = function() {
  T.loggedInStatus();
  return T.getBoards();
};

T.error = function(data) {
  var message = data ? data : "Authorization failed";
  return console.error(message);
};

T.getBoards = function(){
  return Trello.get("/members/me/boards?filter=open", function(data) {
    return data.forEach(function(board) {
      $(".boards").prepend("<option value='"+ board.id +"'>"+ board.name +"</option>");
    });
  }, T.error);
};

T.duplicateBoard = function(){
  event.preventDefault();
  var name           = $("#name").val();
  var idBoardSource  = $("#idBoardSource").val();
  var oldStartDate   = $("#old-start-date").val();
  var newStartDate   = $("#new-start-date").val();
  var direction      = $("#direction").val();
  var newBoard       = $("input[name='new']:checked").val();
  var dayDifference  = T.dayDifference(oldStartDate, newStartDate, direction);

  if (newBoard === 'yes') {
    $(".message").text("Duplicating board...");
    var data = {
      name: name,
      idBoardSource: idBoardSource
    };

    return Trello.post("/boards", data, function(data) {
      $(".message").text("Board data recieved.");
      return T.moveCards(data.id, dayDifference);
    }, T.error);

  } else {
    $(".message").text("Fetching board...");

    return Trello.get('/boards/' + idBoardSource, function(data) {
      $(".message").text("Board data recieved.");
      return T.moveCards(data.id, dayDifference);
    }, T.error);

  }
};

T.moveCards = function(id, dayDifference){
  $(".message").text("Fetching cards.");

  Trello.get("/boards/"+id+"/cards", function(data) {
    var numberOfCards = data.length;
    $(".message").text(numberOfCards + " cards found");

    data.forEach(function(card, index) {
      // Delay for rate limiting, 100 calls per 10 seconds
      // - http://help.trello.com/article/838-api-rate-limits
      setTimeout(function(){
        numberOfCards--;

        if (card.due) {
          var newDate = T.createNewDate(card.due, dayDifference);
          Trello.put("/cards/"+card.id+"/due", { value: newDate }, function(data) {
            $(".message").text(numberOfCards + " cards remaining");
            if (numberOfCards === 0) return $(".message").text("Complete!");
          }, T.error);
        }
      }, 100*index);
    });
  });
};

T.dayDifference = function(oldStartDate, newStartDate, direction){
  // Number of milliseconds in a day
  var oneDay = 24*60*60*1000;

  // Calculate the number of days between course start dates
  var date1  = new Date(oldStartDate);
  var date2  = new Date(newStartDate);
  var difference = Math.round(Math.abs((date1.getTime() - date2.getTime())/(oneDay)));
  return direction === "+" ? difference: -difference;
};

T.createNewDate = function(dueOriginally, dayDifference) {
  // Convert old date into a Date object
  var newDate = new Date(dueOriginally);

  // Set new date and account for change in Datetime
  return newDate.setDate(newDate.getDate() + dayDifference);
};
