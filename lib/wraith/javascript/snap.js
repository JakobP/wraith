var system = require('system');
var page = require('webpage').create();
var fs = require('fs');

if (system.args.length === 3) {
    console.log('Usage: snap.js <some URL> <view port width> <target image name>');
    phantom.exit();
}

var url = system.args[1];
var image_name = system.args[3];
var view_port_width = system.args[2];
var current_requests = 0;
var last_request_timeout;
var final_timeout;


page.viewportSize = { width: view_port_width, height: 1500};
page.settings = { loadImages: true, javascriptEnabled: true };

// If you want to use additional phantomjs commands, place them here
page.settings.userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_8_2) AppleWebKit/537.17 (KHTML, like Gecko) Chrome/28.0.1500.95 Safari/537.17';

// You can place custom headers here, example below.
// page.customHeaders = {

//      'X-Candy-OVERRIDE': 'https://api.live.bbc.co.uk/'
 
//  };

// If you want to set a cookie, just add your details below in the following way.

// phantom.addCookie({
//     'name': 'ckns_policy',
//     'value': '111',
//     'domain': '.bbc.co.uk'
// });
// phantom.addCookie({
//     'name': 'locserv',
//     'value': '1#l1#i=6691484:n=Oxford+Circus:h=e@w1#i=8:p=London@d1#1=l:2=e:3=e:4=2@n1#r=40',
//     'domain': '.bbc.co.uk'
// });

page.onResourceRequested = function(req) {
  current_requests += 1;
};

page.onResourceReceived = function(res) {
  if (res.stage === 'end') {
    current_requests -= 1;
    debounced_render();
  }
};

page.open(url, function(status) {
  if (status !== 'success') {
    console.log('Error with page ' + url);
    phantom.exit();
  }
});


// Setting dimensions for page.render() and logs warning if horizontal scrollbar is active
// Ensures that the image captured is the desired dimensions,
// even if the document is wider than the viewport i.e. the vertical scrollbar is active
function set_render_dimensions(){
  var pageHeight = page.evaluate(function() {
    return document.body.clientHeight;;
  });
  var pageWidth = page.evaluate(function() {
    return document.body.clientWidth;;
  });

  // Checking if the document width is what we expected. If not a warning is logged.
  if(pageWidth != view_port_width) {
    console.log("Horizontal scrollbar may be visible on " + url);
    console.log("Document width: " + pageWidth);
    console.log("Viewport width: " + view_port_width)
  }

  // Setting the dimensions for page.render
  page.clipRect = {
    top: 0,
    left: 0,
    width: view_port_width,
    height: pageHeight
  };
}

// Saving the URL of the page in a .txt file. The filename is the same as the page name in the config file.
// These files ar read by gallery_template.erb
// This is a horribly hacky way of getting links to the checked pages in the gallery
function save_url_in_file(){
  // Getting directory from the image_name
  var endIndex = image_name.lastIndexOf("/");
  var dir = image_name.substring(0, endIndex);
  dir = fs.workingDirectory + "/" + dir + "/";

  // Getting the name of the page from image_name
  // Removing everyting before the last _
  var parts = image_name.split('_');
  var page_name = parts[parts.length - 1];

  // Removing file extension
  var endIndex = page_name.lastIndexOf(".");
  var page_name = page_name.substring(0, endIndex);

  // Writing to file
  try
  {
    fs.write(dir + page_name + ".txt", url, 'w');
  }
    catch(e)
  {
    console.log(e);
  }

}

function debounced_render() {
  clearTimeout(last_request_timeout);
  clearTimeout(final_timeout);

  // If there's no more ongoing resource requests, wait for 1 second before
  // rendering, just in case the page kicks off another request
  if (current_requests < 1) {
      clearTimeout(final_timeout);
      last_request_timeout = setTimeout(function() {
          set_render_dimensions(); 
          console.log('Snapping ' + url + ' at width ' + view_port_width);
          page.render(image_name);

          save_url_in_file()

          phantom.exit();
      }, 1000);
  }

  // Sometimes, straggling requests never make it back, in which
  // case, timeout after 5 seconds and render the page anyway
  final_timeout = setTimeout(function() {
    set_render_dimensions(); 
    console.log('Snapping ' + url + ' at width ' + view_port_width);
    page.render(image_name);

    save_url_in_file()

    phantom.exit();
  }, 5000);
}