// Read a page's GET URL variables and return them as an associative array.
function getUrlVars()
{
    var vars = [], hash;
    var hashes = window.location.href.slice(window.location.href.indexOf('?') + 1).split('&');
    for(var i = 0; i < hashes.length; i++)
    {
        hash = hashes[i].split('=');
        vars.push(hash[0]);
        vars[hash[0]] = hash[1];
    }
    return vars;
}


function loadInstagramPhotos(cb) {
  $.ajax({
    'url': '/api/users/me/instagram-photos',
    'type': 'GET',
    'data': {
      //fill in access token
      access_token: 'wMw5yXS7W7WGuhKJPhp9vtVFfBxLEVWci7XBcLiVhDs4h4vbb2bXjoZOrPLiCZk8'
    },
    'success': function(data) {
      cb(data);
    }
  });  
}


function renderAllPhotos(container) {
  loadInstagramPhotos(function(data) {
    for (i in data.photos) {
      var photo = data.photos[i];
      console.log("photo", photo);
      var item = "<div class='col-md-3'>\
                  <p>" + photo.location.name + "</p>";
      item += "<img src='" + photo.images.standard_resolution.url + "'/>";
      item += "</div>";

      container.append($(item));
    }
  });
}

function renderOnePhoto(container) {
  loadInstagramPhotos(function(data) {
    var randomIndex = Math.floor(Math.random() * data.photos.length);
    var photo = data.photos[randomIndex];
    console.log("photo", photo);
    //parse out the date
    var date = new Date(parseInt(photo.created_time) * 1000);

    var item = "<p>" + photo.location.name + "</p>";
    item += "<p>" + (date.getMonth()+1)+"/"+date.getDate()+"/"+date.getFullYear() + "</p>";
    item += "<img src='" + photo.images.standard_resolution.url + "'/>";
    item += "</div>";

    container.empty().append($(item));
  });
}

