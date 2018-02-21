Marlowe APM Visualization Tool
================

This is a [Sinatra app](http://www.sinatrarb.com/) used to present
page event data in different charts using [D3](http://d3js.org/).
It's meant to be a simple platform for exploring Application
Performance Management (APM) data with experimental visualizations and
animations.  I welcome contributions.

Requirements
---------------

1. Ruby 2.4.1
2. Smattering of ruby gems, including Sinatra, Rack

Running the Tool
----------------

1. git clone https://github.com/newrelic/marlowe.git
2. bundle install
3. rackup


Adding your own dataset
----------------
Just add json files to the data directory using the following format:

     [ 
     ["epochtime", "timestamp", "duration", "name", "name.previous", "country", "city"],
     [1518064243, "2018-02-07 20:30:43 -0800", 14.275, "Controller/applications/show", "Controller/applications/show", "NZ", "Wellington"],
     [1518064243, "2018-02-07 20:30:43 -0800", 8.79, "Controller/named_transactions/index", "Controller/applications/problems", "BR", "Sao Paulo"],
     [1518064243, "2018-02-07 20:30:43 -0800", 14.668, "Controller/applications/show", "Controller/applications/show", "US", "Los Angeles"],
     ....

The columns must include ["epochtime", "timestamp", "duration", "name", "name.previous", "country", "city"] and in that order.


Changes
------------------

### Oct 1, 2014

* Fixed plotlines in legend
* Added help text to legend to indicate you can toggle plots on and off
* New dataset
* Ruby 2.1.1
* Minor bug fixes and whitespace cleanup

### Aug 15, 2013

Implemented selectors allowing you to pick different dimensions in a
single dataset.

### Aug 9, 2013

Implemented alternative format for datasets paving the way for doing
more with datasets that had more than one dimension.

### July 8, 2013

Added quartile region shading in historgrams and timeseries charts

### July 3, 2013

Incorporated [Ward Cuningham](http://c2.org)'s Traffic demo

### June 29, 2013

Added a horizon chart

### June 2013

Introduced Marlowe in preparation for talk at Velocity Santa Clara 2013


Special Thanks
------------------

Ward Cunningham for inspiration with "the summer of d3" and the
contribution of the Treemap and Traffic demos.

Etan Lightstone, Patrick Lightbody and the rest of the New Relic crew
who helped out greatly with feedback and suggestions.

