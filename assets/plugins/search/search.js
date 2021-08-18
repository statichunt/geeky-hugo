summaryInclude = 100;
var fuseOptions = {
  isCaseSensitive: false,
  includeScore: false,
  shouldSort: true,
  includeMatches: true,
  findAllMatches: false,
  minMatchCharLength: 3,
  location: 0,
  threshold: 0.5,
  distance: 50,
  useExtendedSearch: false,
  ignoreLocation: false,
  ignoreFieldNorm: false,
  keys: [{
      name: "title",
      weight: 0.8
    },
    {
      name: "tags",
      weight: 0.5
    },
    {
      name: "categories",
      weight: 0.5
    },
    {
      name: "contents",
      weight: 0.3
    }
  ]
};

var searchQuery = param("s");
if (searchQuery) {
  $("#search-query").val(searchQuery);
  executeSearch(searchQuery);
}

function executeSearch(searchQuery) {
  $.getJSON(indexURL, function (data) {
    var pages = data;
    var fuse = new Fuse(pages, fuseOptions);
    var result = fuse.search(searchQuery);
    if (result.length > 0) {
      populateResults(result);
    } else {
      $('#search-results').append("<div class=\"text-center\"><img class=\"img-fluid mb-5\" src=\"https://user-images.githubusercontent.com/37659754/129837093-dcf35b93-982a-48d5-a9fd-4035dcefc4e0.png\" width=\"200\"><h3>No Search Found</h3></div>");
    }
  });
}

function populateResults(result) {
  $.each(result, function (key, value) {
    var contents = value.item.contents;
    var snippet = "";
    var snippetHighlights = [];
    if (fuseOptions.tokenize) {
      snippetHighlights.push(searchQuery);
    } else {
      $.each(value.matches, function (matchKey, mvalue) {
        if (mvalue.key === "tags" || mvalue.key === "categories") {
          snippetHighlights.push(mvalue.value);
        } else if (mvalue.key == "contents") {
          start = mvalue.indices[0][0] - summaryInclude > 0 ? mvalue.indices[0][0] - summaryInclude : 0;
          end = mvalue.indices[0][1] + summaryInclude < contents.length ? mvalue.indices[0][1] + summaryInclude : contents.length;
          snippet += contents.substring(start, end);
          snippetHighlights.push(mvalue.value.substring(mvalue.indices[0][0], mvalue.indices[0][1] - mvalue.indices[0][0] + 1));
        }
      });
    }

    if (snippet.length < 1) {
      snippet += contents.substring(0, summaryInclude * 2);
    }
    //pull template from hugo templarte definition
    var templateDefinition = $('#search-result-template').html();
    //replace values
    var output = render(templateDefinition, {
      key: key,
      title: value.item.title,
      image: value.item.image,
      date: value.item.date,
      link: value.item.permalink,
      tags: value.item.tags,
      categories: value.item.categories,
      snippet: snippet
    });
    $('#search-results').append(output);

    $.each(snippetHighlights, function (snipkey, snipvalue) {
      $("#summary-" + key).mark(snipvalue);
    });
  });
}

function param(name) {
  return decodeURIComponent((location.search.split(name + '=')[1] || '').split('&')[0]).replace(/\+/g, ' ');
}

function render(templateString, data) {
  var conditionalMatches, conditionalPattern, copy;
  conditionalPattern = /\$\{\s*isset ([a-zA-Z]*) \s*\}(.*)\$\{\s*end\s*}/g;
  //since loop below depends on re.lastInxdex, we use a copy to capture any manipulations whilst inside the loop
  copy = templateString;
  while ((conditionalMatches = conditionalPattern.exec(templateString)) !== null) {
    if (data[conditionalMatches[1]]) {
      //valid key, remove conditionals, leave contents.
      copy = copy.replace(conditionalMatches[0], conditionalMatches[2]);
    } else {
      //not valid, remove entire section
      copy = copy.replace(conditionalMatches[0], '');
    }
  }
  templateString = copy;
  //now any conditionals removed we can do simple substitution
  var key, find, re;
  for (key in data) {
    find = '\\$\\{\\s*' + key + '\\s*\\}';
    re = new RegExp(find, 'g');
    templateString = templateString.replace(re, data[key]);
  }
  return templateString;
}