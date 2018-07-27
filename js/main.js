/** 
 * References
 * WorldMap with zoom slider based on http://bl.ocks.org/nivas8292/bec8b161587cb62e9fda 
 * Time Slider based on http://bl.ocks.org/cmdoptesc/fc0e318ce7992bed7ca8 
 */

var minYear = 1918, maxYear = 2018;     // Define years range for the time slider.
var currentYear = minYear;              // The curent pointed year.
var comboboxes;                         // Legend's combobox group.
var dateStringFormat = "DD/MM/YYYY";
var width = d3.select('#map').node().getBoundingClientRect().width,
    height = d3.select('#map').node().getBoundingClientRect().height;

/* reload page on rise - to fix broken sized map */
$(window).resize(function () {
    location.reload(true);
});

var tooltip = d3.select("body").append("div").attr("class", "tooltip");        // create tooltip div

var center = [width / 2, height / 2];
var projection = d3.geo.equirectangular().scale(height / Math.PI).translate(center);
var path = d3.geo.path().projection(projection);
var svg = d3.select("#map").append("svg").attr("id", 'svg-map');
var g = svg.append("g");

/* Read world map json and draw the map */
d3.json("data/world-110m.json", function (error, topology) {
    g.selectAll("path")
        .data(topojson.object(topology, topology.objects.countries).geometries)
        .enter()
        .append("path")
        .attr("d", path);
});


/**
 * Class Phenomenon
 * @param {*} type 
 * @param {*} date 
 * @param {*} time 
 * @param {*} severity 
 */
function Phenomenon(type, color, date, time, severity, longitude, latitude) {
    this.Type = type;
    this.Color = color;
    this.Date = date;
    this.Time = time;
    this.Severity = parseFloat(severity);
    this.Longitude = parseFloat(longitude);
    this.Latitude = parseFloat(latitude);
    if (isNaN(this.Severity) || isNaN(this.Longitude) || isNaN(this.Latitude)) {
        var err = "Bad Parameters: " + this.Severity + ", " + this.Longitude + ", " + this.Latitude;
        console.log(err);
        throw err;
    }
}


/* Enable ToolTip */
function enableToolTip(text, color) {
    if (color == undefined)
        color = "darkgreen";
    tooltip.style("border-color", color);
    tooltip.transition()
        .style("border-color", color)
        .duration(300)
        .style("opacity", .9);
    tooltip.html("<b>" + text + "</b>")
        .style("left", (d3.event.pageX + 5) + "px")
        .style("top", (d3.event.pageY - 28) + "px");
}

/* Disable ToolTip */
function disableToolTip() {
    tooltip.transition()
        .duration(500)
        .style("opacity", 0)
        .style("border-color", "darkblue");
}


var naturalDisasters, earthquakes, tsunami, cyclone, volcan;
var eqScale, cScale, tScale, vScale;
/* Initialization function - when document fully loaded */
$(document).ready(function () {
    width = d3.select('#map').node().getBoundingClientRect().width;
    height = d3.select('#map').node().getBoundingClientRect().height;
    $('#yearsNumTitle').text(maxYear - minYear);
    comboboxes = [$("#cb-1"), $("#cb-2"), $("#cb-3"), $("#cb-4")];

    /* Parse Earthquakes Data */
    d3.csv("data/earthquakes.csv", function (error, eqs) {
        if (error != null) {
            console.log(error);
            return;
        }
        earthquakes = [];
        var max = d3.max(eqs, function (d) { return d.Magnitude; });
        var min = d3.min(eqs, function (d) { return d.Magnitude; });
        eqScale = d3.scale.linear().domain([min, max]).range([3, 10]);
        eqs.forEach(function (e) {
            var s = parseFloat(e.Magnitude);
            var lon = parseFloat(e.Longitude);
            var lat = parseFloat(e.Latitude);
            var dateStr = moment(e.Date, "MM DD YYYY").format(dateStringFormat);
            if (!isNaN(s) && !isNaN(lon) && !isNaN(lat)) {
                earthquakes.push(new Phenomenon("Earthquake", "brown", dateStr, e.Time, eqScale(s), lon, lat));
            }
        });
        var oldEq = [];
        d3.csv("data/olderEarthquakes.csv", function (error, oeqs) {
            if (error != null) {
                console.log(error);
                return;
            }
            oeqs.forEach(function (e) {
                var s = parseFloat(e.mag);
                var lon = parseFloat(e.longitude);
                var lat = parseFloat(e.latitude);
                var dateStr = moment(e.time.substr(0, 10), "YYYY MM DD").format(dateStringFormat);
                var timeStr = e.time.substring(11, 16);
                if (!isNaN(s) && !isNaN(lon) && !isNaN(lat)) {
                    oldEq.push(new Phenomenon("Earthquake", "brown", dateStr, timeStr, eqScale(s), lon, lat));
                }
            });
            earthquakes = oldEq.concat(earthquakes);
        });
    }); // parse earthquakes

    d3.csv("data/tsunami.csv", function (error, ts) {
        if (error != null) {
            console.log(error);
            return;
        }
        tsunami = [];
        var max = d3.max(ts, function (d) { return d.TS_INTENSI; });
        var min = d3.min(ts, function (d) { return d.TS_INTENSI; });
        tScale = d3.scale.linear().domain([min, max]).range([3, 10]);
        ts.forEach(function (t) {
            var s = parseFloat(t.TS_INTENSI);
            var lon = parseFloat(t.LONGITUDE);
            var lat = parseFloat(t.LATITUDE);
            if (!isNaN(s) && !isNaN(lon) && !isNaN(lat)) {

                var timeStr = "" + t.ARR_HOUR + ":" + t.ARR_MIN;
                var dateStr = moment(t.DATE_STRIN, "YYYY MM DD").format(dateStringFormat);
                tsunami.push(new Phenomenon("Tsunami", "blue", dateStr, timeStr, tScale(s), lon, lat));
            }
        });
    }); // parse tsunami.

    d3.csv("data/pacific.csv", function (error, ts) {
        if (error != null) {
            console.log(error);
            return;
        }
        cyclone = [];
        var max = d3.max(ts, function (d) { return d["Maximum Wind"]; });
        var min = d3.min(ts, function (d) { return d["Maximum Wind"]; });
        cScale = d3.scale.linear().domain([min, max]).range([1, 5]);
        ts.forEach(function (t) {
            var s = parseFloat(t["Maximum Wind"]);
            var lon = parseFloat(t.Longitude.replace("W", ""));
            var lat = parseFloat(t.Latitude.replace("N", ""));
            if (!isNaN(s) && !isNaN(lon) && !isNaN(lat)) {
                var timeStr;
                switch (t.Time.length) {
                    case 4:
                        timeStr = t.Time.substr(0, 2) + ":" + t.Time.substr(2, 4);
                        break;
                    case 3:
                        timeStr = t.Time.substr(0, 1) + ":" + t.Time.substr(1, 3);
                        break;
                    default:
                        timeStr = "00:00";
                        break;
                }
                var dateStr = moment(t.Date, "YYYYMMDD").format(dateStringFormat);
                cyclone.push(new Phenomenon("Cyclone", "grey", dateStr, timeStr, cScale(s), lon, lat));
            }
        });
        d3.csv("data/atlantic.csv", function (error, ts2) {
            if (error != null) {
                console.log(error);
                return;
            }
            max = Math.max(max, d3.max(ts, function (d) { return d["Maximum Wind"]; }));
            min = Math.min(d3.min(ts, function (d) { return d["Maximum Wind"]; }));
            cScale = d3.scale.linear().domain([min, max]).range([1, 5]);
            ts2.forEach(function (t) {
                var s = parseFloat(t["Maximum Wind"]);
                var lon = parseFloat(t.Longitude.replace("W", ""));
                var lat = parseFloat(t.Latitude.replace("N", ""));
                if (!isNaN(s) && !isNaN(lon) && !isNaN(lat)) {
                    var timeStr;
                    switch (t.Time.length) {
                        case 4:
                            timeStr = t.Time.substr(0, 2) + ":" + t.Time.substr(2, 4);
                            break;
                        case 3:
                            timeStr = t.Time.substr(0, 1) + ":" + t.Time.substr(1, 3);
                            break;
                        default:
                            timeStr = "00:00";
                            break;
                    }
                    var dateStr = moment(t.Date, "YYYYMMDD").format(dateStringFormat);
                    cyclone.push(new Phenomenon("Cyclone", "grey", dateStr, timeStr, cScale(s), lon, lat));
                }
            });
        });
    });

    d3.csv("data/volcan.csv", function (error, volcans) {
        if (error != null) {
            console.log(error);
            return;
        }
        volcan = [];
        // todo: calculate severity (understand by houses destroyed, deaths, etc..)
        vScale = d3.scale.linear().domain([1, 10]).range([3, 10]);
        volcans.forEach(function (v) {
            var s = 3.0;        // todo: calculate severity (understand by houses destroyed, deaths, etc..)
            var lon = parseFloat(v.Longitude);
            var lat = parseFloat(v.Latitude);
            if (!isNaN(s) && !isNaN(lon) && !isNaN(lat)) {

                var timeStr = volcans.time;
                var dateStr = "" + v.Day + "/" + v.Month + "/" + v.Year;
                volcan.push(new Phenomenon("Volcanic Eruption", "red", dateStr, timeStr, vScale(s), lon, lat));
            }
        });
    }); // parse volcanic eruptions.

    buildTimeSlider();
    svg.call(zoom);
    $("input").prop("disabled", false);
}); // document ready


var filtered;               // filtered phenomena by year and check box.
async function parseAll() {
    svg.selectAll(".dot").remove();

    filtered = [];
    naturalDisasters = [];
    /* Filter checked phenomena */
    if (comboboxes[0].is(':checked')) {
        naturalDisasters = naturalDisasters.concat(earthquakes);
    }
    if (comboboxes[1].is(':checked')) {
        naturalDisasters = naturalDisasters.concat(tsunami);
    }
    if (comboboxes[2].is(':checked')) {
        naturalDisasters = naturalDisasters.concat(cyclone);
    }
    if (comboboxes[3].is(':checked')) {
        naturalDisasters = naturalDisasters.concat(volcan);
    }
    /* Get filtered natural disasters by currentYear */
    filtered = naturalDisasters.filter(function (e) {
        if (e != undefined) {
            return moment(e.Date, dateStringFormat).get('year').toString() == currentYear;
        }
    });

    /* Draw circles */
    svg.selectAll("circle")
        .data(filtered)
        .enter()
        .append("circle")
        .attr("class", "dot")
        .attr("cx", function (d) { return projection([d.Longitude, d.Latitude])[0]; })
        .attr("cy", function (d) { return projection([d.Longitude, d.Latitude])[1]; })
        .style("fill", function (d) { return d.Color; })
        .on("mouseover", function (d) {
            d3.select(this).style("fill", d3.rgb(d.Color).darker(2));
            var text = "<type><font color=\"" + d.Color + "\">" + d.Type + "</font></type>";
            if (d.Date != undefined) text += "<br/>Date: " + d.Date;
            if (d.Time != undefined) text += "<br/>Time: " + d.Time;
            text += "<br/>Severity: " + d.Severity.toFixed(2);
            enableToolTip(text, d.Color);
        })
        .on("mouseout", function (d) {
            d3.select(this).style("fill", d.Color);
            disableToolTip();
        })
        .transition()
        .attr("transform", "translate(" + zoom.translate().join(",") + ") scale(" + zoom.scale() + ")") // align pos to map
        .each("start", function () {
            d3.select(this)
                .attr("r", 0)
        })
        .each("end", function () {
            d3.select(this)
                .transition()
                .duration(500)
                .attr("r", function (d) { return d.Severity / zoom.scale(); })
        });

}   // parse all

/* Build time slider */
function buildTimeSlider() {
    $('#time-slider').empty();
    d3.select('#time-slider').call(d3.slider()
        .axis(true).min(minYear).max(maxYear).step(1)
        .on("slide", function (evt, value) {
            currentYear = value;
        })
        .on("slideend", function () {
            parseAll();
        })
    );
    d3.select('#time-slider').on("mouseover", function () { enableToolTip(currentYear); })
        .on("mouseout", disableToolTip);
}


/*********************************** Map ZooM and drag handling *******************************/

var zoom = d3.behavior.zoom()
    .scaleExtent([1, 10])
    .on("zoom", function () {
        var scale = d3.event.scale;
        var h = height * scale;
        var w = width * scale;
        var padding = 0;
        var translation = d3.event.translate;
        var tbound = -(h - height) - padding;
        var bbound = padding;
        var lbound = -(w - width) - padding;
        var rbound = padding;
        translation = [
            Math.max(Math.min(translation[0], rbound), lbound),
            Math.max(Math.min(translation[1], bbound), tbound)
        ];

        g.attr("transform", "translate(" + translation + ") scale(" + d3.event.scale + ")");
        g.selectAll("path")
            .attr("d", path.projection(projection));
        svg.selectAll(".dot")
            .attr("transform", "translate(" + d3.event.translate.join(",") + ") scale(" + d3.event.scale + ")")
            .transition()
            .attr("r", function (d) { return d.Severity / zoom.scale(); });
        d3.select("#map-zoomer").node().value = zoom.scale();
    });

d3.select('#zoom-in').on('click', function () {
    var scale = zoom.scale(), extent = zoom.scaleExtent(), translate = zoom.translate();
    var x = translate[0], y = translate[1];
    var factor = 1.2;
    var target_scale = scale * factor;
    if (scale === extent[1]) {
        return false;
    }
    var clamped_target_scale = Math.max(extent[0], Math.min(extent[1], target_scale));
    if (clamped_target_scale != target_scale) {
        target_scale = clamped_target_scale;
        factor = target_scale / scale;
    }
    x = (x - center[0]) * factor + center[0];
    y = (y - center[1]) * factor + center[1];
    zoom.scale(target_scale).translate([x, y]);
    g.transition().attr("transform", "translate(" + zoom.translate().join(",") + ") scale(" + zoom.scale() + ")");
    g.selectAll("path")
        .attr("d", path.projection(projection));

    svg.selectAll(".dot")
        .transition()
        .attr("transform", "translate(" + zoom.translate().join(",") + ") scale(" + zoom.scale() + ")")
        .attr("r", function (d) { return d.Severity / zoom.scale(); });

    d3.select("#map-zoomer").node().value = zoom.scale();
});

d3.select('#zoom-out').on('click', function () {
    var scale = zoom.scale(), extent = zoom.scaleExtent(), translate = zoom.translate();
    var x = translate[0], y = translate[1];
    var factor = 1 / 1.2;
    var target_scale = scale * factor;
    if (scale === extent[0]) {
        return false;
    }
    var clamped_target_scale = Math.max(extent[0], Math.min(extent[1], target_scale));
    if (clamped_target_scale != target_scale) {
        target_scale = clamped_target_scale;
        factor = target_scale / scale;
    }
    x = (x - center[0]) * factor + center[0];
    y = (y - center[1]) * factor + center[1];
    zoom.scale(target_scale).translate([x, y]);
    g.transition()
        .attr("transform", "translate(" + zoom.translate().join(",") + ") scale(" + zoom.scale() + ")");
    g.selectAll("path")
        .attr("d", path.projection(projection));

    svg.selectAll(".dot")
        .transition()
        .attr("transform", "translate(" + zoom.translate().join(",") + ") scale(" + zoom.scale() + ")")
        .attr("r", function (d) { return d.Severity / zoom.scale(); });
    d3.select("#map-zoomer").node().value = zoom.scale();
});

d3.select('#reset').on('click', function () {
    zoom.translate([0, 0]);
    zoom.scale(1);
    g.transition().attr("transform", "translate(" + zoom.translate().join(",") + ") scale(" + zoom.scale() + ")");
    g.selectAll("path")
        .attr("d", path.projection(projection))
    svg.selectAll(".dot")
        .transition()
        .attr("transform", "translate(" + zoom.translate().join(",") + ") scale(" + zoom.scale() + ")")
        .transition()
        .attr("r", function (d) { return d.Severity / zoom.scale(); });
    d3.select("#map-zoomer").node().value = zoom.scale();
});

d3.select('#map-zoomer').on("change", function () {
    var scale = zoom.scale(), extent = zoom.scaleExtent(), translate = zoom.translate();
    var x = translate[0], y = translate[1];
    var target_scale = +this.value;
    var factor = target_scale / scale;
    var clamped_target_scale = Math.max(extent[0], Math.min(extent[1], target_scale));
    if (clamped_target_scale != target_scale) {
        target_scale = clamped_target_scale;
        factor = target_scale / scale;
    }
    x = (x - center[0]) * factor + center[0];
    y = (y - center[1]) * factor + center[1];
    zoom.scale(target_scale).translate([x, y]);
    g.transition()
        .attr("transform", "translate(" + zoom.translate().join(",") + ") scale(" + zoom.scale() + ")");
    g.selectAll("path")
        .attr("d", path.projection(projection));

    svg.selectAll(".dot")
        .transition()
        .attr("transform", "translate(" + zoom.translate().join(",") + ") scale(" + zoom.scale() + ")")
        .attr("r", function (d) { return d.Severity / zoom.scale(); });
});

/*************************** end drag / zoom logics ******************************* */