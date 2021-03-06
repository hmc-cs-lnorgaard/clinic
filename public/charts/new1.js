titles = {"epochtime":0,"timestamp":1,"duration":2,"name":3,"name.previous":4,"country":5,"city":6}


// Settings for svg/d3 stuff
var margin = $data.margin;
var width = 700 - margin.left - margin.right;
var height = 700 - margin.top - margin.bottom;
var padding = 20;

// Our data structures
var allPages = []; 
var nodesByPage = []; 
var pageHierarchy = [];
var stream;
var portionOfData = 30; // how many pieces we are dividing our data into


function initTraffic(div, json) {
    if (stream == null) {
        return;
    }
    // Organize all the data structures
    getAllPages(json);
    formatData(json);
    sortPagesAlphabetically();
    createHierarchy();
    
    // Draw the circles with D3
    drawCircles(div);
}


/** Empties and repopulates nodesByPage dictionary 
        newData: all the data, formatted like the json file
        nodesByPage: dictionary of all the requests data with pages as keys
*/
function formatData(newData) {
    nodesByPage = [];
    for (i = 0; i < newData.length/portionOfData; i++) {
        var pageName = newData[i][titles["name"]];
        if (nodesByPage[pageName] == null) {
            nodesByPage[pageName] = [];
            nodesByPage[pageName].push(newData[i]);
        } else {
            nodesByPage[pageName].push(newData[i]);
        }
    }
}

/** Empties and repopulates allPages dictionary 
        allPages: an array of all the pages in the app
        json: the data 
*/
function getAllPages(json) {
    allPages = [];
    for (i = 0; i < json.length/portionOfData; i++) {
        if (allPages.indexOf(json[i][titles["name"]]) <= -1) {
            allPages.push(json[i][titles["name"]]);
        }
    }
}

/** Takes in a url and creates a list with all of the components of the url in order, e.g.
    "firstpart/secondpart/thirdpart" -> ["firstpart", "secondpart", "thirdpart"]
*/
function pageToList(page) {
    var pageList = page.split("/");
    return pageList;
}

/** Sorts allPages alphabetically */
function sortPagesAlphabetically() {
    allPages.sort();
}

/** Creates a hierarchical dictionary of the pages */
function createHierarchy() {

    pageHierarchy = []; // empty the existing hierarchy

    for (i = 0; i < allPages.length; i++) {

        var currPage = allPages[i]; // full url of the page we are looking at
        var pageComponentList = pageToList(currPage); // convert the url to a list of the components
        var levelInHierarchy = pageHierarchy; // initialize/reset the level
        var currURL = ""; // initialize/reset the url
        var name = "name";
        var children = "children";

        // Loop through the components of the url, looking for a parent in the hierarchy
        for (j = 0; j < pageComponentList.length; j++) {

            currURL = currURL + pageComponentList[j];
            var notDone = true; 
            var levelSize = levelInHierarchy.length;  
            var currIndex = 0;    

            // Keep looping until we find the right place to put the URL
            while (notDone && (currIndex < levelSize)) {
                var currDict = levelInHierarchy[currIndex];

                // Case 1: found it
                if (currDict[name] == currURL) { 
                    levelInHierarchy = currDict[children];
                    notDone = false;
                } 

                // Case 2: didn't find it yet
                else { 
                    currIndex = currIndex + 1;
                }
            }  

            // Case 3: never found it, create a new dictionary
            if (notDone) { 
                var newDict = {};
                newDict[name] = currURL;
                newDict[children] = [];
                if (j == pageComponentList.length - 1) {
                    addDataToHierarchy(newDict);
                }
                levelInHierarchy.push(newDict);
                levelInHierarchy = newDict[children];
            } 

            currURL = currURL + "/";
        }
    }
}

/** Puts the numerical data into the hierarchy, assuming the hierarchy
    structure is already there and correct
*/
function addDataToHierarchy(dict) {
    var name = dict["name"];
    var children = dict["children"]; 
    var data = nodesByPage[name];
    for (var i = 0; i < data.length; i++) {
        var d = data[i];
        var newEntry = {};
        for (t in titles) {
            newEntry[t] = d[titles[t]];
        }
        newEntry["name"] = (newEntry["duration"]).toString();
        children.push(newEntry);
    }

    // for each piece of data, add start time as "name" and 
    // (end time - start time) as "size"
}

function drawCircles(div) {

    var bodySelection = d3.select("body");
    var svgSelection = bodySelection.append("svg")
        .attr("width", width)
        .attr("height", width);

    var svg = d3.select("svg"),
            margin = 20,
            diameter = +svg.attr("width"),
            g = svg.append("g").attr("transform", "translate(" + diameter / 2 + "," + diameter / 2 + ")");

    var color = d3.scale.linear()
        .domain([-1, 5])
        .range(["hsl(152,80%,80%)", "hsl(228,30%,40%)"])
        .interpolate(d3.interpolateHcl);

    var pack = d3.pack()
        .size([diameter - margin, diameter - margin])
        .padding(2);

    var root = d3.hierarchy(pageHierarchy[0])
              .sum(function(d) { return d.duration; })
              .sort(function(a, b) { return b.duration - a.duration; });

    var focus = root,
        nodes = pack(root).descendants(),
        view;

    var circle = g.selectAll("circle")
        .data(nodes)
        .enter().append("circle")
            .attr("class", function(d) { return d.parent ? d.children ? "node" : "node node--leaf" : "node node--root"; })
            .style("fill", function(d) { return d.children ? color(d.depth) : null; })
            .on("click", function(d) { if (focus !== d) zoom(d), d3.event.stopPropagation(); });

    var text = g.selectAll("text")
        .data(nodes)
        .enter().append("text")
            .attr("class", "label")
            .style("fill", "white")
            .style("fill-opacity", function(d) { return d.parent === root ? 1 : 0; })
            .style("display", function(d) { return d.parent === root ? "inline" : "none"; })
            .text(function(d) { return d.data.name; });

    var node = g.selectAll("circle,text");

    svg
        .style("background", color(-1))
        .on("click", function() { zoom(root); });

    zoomTo([root.x, root.y, root.r * 2 + margin]);

    function zoom(d) {
        var focus0 = focus; focus = d;

        var transition = d3.transition()
            .duration(d3.event.altKey ? 7500 : 750)
            .tween("zoom", function(d) {
                var i = d3.interpolateZoom(view, [focus.x, focus.y, focus.r * 2 + margin]);
                return function(t) { zoomTo(i(t)); };
            });

        transition.selectAll("text")
            .filter(function(d) { return d.parent === focus || this.style.display === "inline"; })
                .style("fill-opacity", function(d) { return d.parent === focus ? 1 : 0; })
                .each("start", function(d) { if (d.parent === focus) this.style.display = "inline"; })
                .each("end", function(d) { if (d.parent !== focus) this.style.display = "none"; });
        }

    function zoomTo(v) {
        var k = diameter / v[2]; view = v;
        node.attr("transform", function(d) { return "translate(" + (d.x - v[0]) * k + "," + (d.y - v[1]) * k + ")"; });
        circle.attr("r", function(d) { return d.r * k; });
    }
}


// This is our main function that calls all the helper functions
function updateTraffic(error, json, div) {
    if (error) {
        readout(error);
    } else {
        var now = new Date().getTime();
        div.node().stream = {dimension: titles["name"], start: now, wall: now, sleep: 0, first: json[0][0], last: json[json.length-1][0], index: 0, data: json};
        stream = div.node().stream;

        d3.selectAll("svg").remove();

        setInterval(initTraffic(div,json), 1000);

        // To access nodes from one page:
        // nodesByPage[allPages[i]]
    }
}

