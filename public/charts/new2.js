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
var portionOfData = 30;


function initTraffic(div,json) {
    if (stream == null) {
        return;
    }
    formatData(json);
    drawCircles(div);
}


/** Empties and repopulates nodesByPage dictionary 
        newData: all the data, formatted like the json file
        nodesByPage: dictionary of all the requests data with pages as keys
*/
function formatData(newData) {
    pageHierarchy = [];
    pageHierarchy[0] = {};
    pageHierarchy[0]["name"] = "app";
    pageHierarchy[0]["children"] = [];
    var currentLevel = pageHierarchy[0]["children"];

    for (i = 0; i < newData.length/portionOfData; i++) {
        var pageName = newData[i][titles["name"]];
        var notDone = true; 
        var levelSize = currentLevel.length;  
        var currIndex = 0;    

        // Keep looping until we find the right place to but the URL
        while (notDone && (currIndex < levelSize)) {
            var currDict = currentLevel[currIndex];

            // Case 1: found it
            if (currDict["name"] == pageName) { 
                var children = currDict["children"]; 
                var newEntry = {};
                for (t in titles) {
                    newEntry[t] = newData[i][titles[t]];
                }
                newEntry["name"] = (newEntry["duration"]).toString();
                children.push(newEntry);
                notDone = false;
            } 

            // Case 2: didn't find it yet
            else { 
                currIndex = currIndex + 1;
            }
        }
        if (notDone) {

            var newDict = {};
            newDict["name"] = pageName;
            newDict["children"] = [];

            var newEntry = {};
            for (t in titles) {
                newEntry[t] = newData[i][titles[t]];
            }
            newEntry["name"] = (newEntry["duration"]).toString();
            newDict["children"].push(newEntry);
            currentLevel.push(newDict);
        }
    }   

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
        
        setInterval(initTraffic(div, json), 1000);

    }
}

