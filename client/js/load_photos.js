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


function loadInstagramPhotos() {
  $.ajax({
    'url': '/api/users/me/instagram-photos',
    'type': 'GET',
    'data': {
      //fill in access token
      access_token: 'wMw5yXS7W7WGuhKJPhp9vtVFfBxLEVWci7XBcLiVhDs4h4vbb2bXjoZOrPLiCZk8'
    },
    'success': function(data) {
      var container = $('#images-container');
      for (i in data.photos) {
        var photo = data.photos[i];
        console.log("photo", photo);
        var item = "<div class='col-md-3'>\
                      <p>" + photo.location.name + "</p>";
            item += "<img src='" + photo.images.standard_resolution.url + "'/>";
            item += "</div>";

        container.append($(item));

      }
    }
  });  
}

$(document).ready(function() {
  loadInstagramPhotos();
});