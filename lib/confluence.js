/**
 * Node.js wrapper for Atlassian's Confluence API.
 * See https://developer.atlassian.com/confdev/confluence-rest-api
 *
 * Copyright (c) 2015, John Duane
 * Released under the MIT License
 */

var request = require('superagent');

/**
 * Construct Confluence.
 *
 * @constructor
 * @this {Confluence}
 * @param {Object} config
 * @param {string} config.username
 * @param {string} config.password
 * @param {string} config.baseUrl
 * @param {number} config.version - Optional
 *
 */
function Confluence(config) {
    if (!(this instanceof Confluence)) return new Confluence(config);

    if (!config) {
        throw new Error("Confluence module expects a config object.");
    }
    else if (!config.username || ! config.password) {
        throw new Error("Confluence module expects a config object with both a username and password.");
    }
    else if (!config.baseUrl) {
        throw new Error("Confluence module expects a config object with a baseUrl.");
    }

    this.config = config;

    this.config.apiPath = '/rest/api';
    this.config.extension = ''; // no extension by default

    if (this.config.version && this.config.version === 4) {
        this.config.apiPath = '/rest/prototype/latest';
        this.config.extension = '.json';
    }
}

function processCallback(cb, err, res) {
    if (err || !res || !res.body) {
        cb(err, res);
    }
    else {
        cb(err, res.body);
    }
}

/**
 * Get space information.
 *
 * @param {string} space
 * @param {Function} callback
 */
Confluence.prototype.getSpace = function(space, callback){

    request
        .get(this.config.baseUrl + this.config.apiPath + "/space" + this.config.extension + "?spaceKey=" + space)
        .auth(this.config.username, this.config.password)
        .end(function(err, res){
            processCallback(callback, err, res);
        });

};

/**
 * Get space home page.
 *
 * @param {string} space
 * @param {Function} callback
 */
Confluence.prototype.getSpaceHomePage = function(space, callback){
    var config = this.config;

    request
        .get(config.baseUrl + config.apiPath + "/space" + config.extension + "?spaceKey=" + space)
        .auth(config.username, config.password)
        .end(function(err, res){
            if (err) {
                callback(err);
            }
            else {
                try {
                    request
                        .get(config.baseUrl + res.body.results[0]._expandable.homepage)
                        .auth(config.username, config.password)
                        .end(function(err, res){
                            processCallback(callback, err, res);
                        });
                }
                catch (e) {
                    callback("Can't find space home page. " + e.message, res);
                }
            }
        });

};

/**
 * Get stored content for a specific space and page title.
 *
 * @param {string} id
 * @param {Function} callback
 */
Confluence.prototype.getContentById = function(id, callback){

    request
        .get(this.config.baseUrl + this.config.apiPath + "/content/" + id + this.config.extension + "?expand=body.storage,version")
        .auth(this.config.username, this.config.password)
        .end(function(err, res){
            processCallback(callback, err, res);
        });
};

/**
 * Get stored content for a specific page id with optional custom expanders.
 *
 * @param {object} options for the custom content request
 * @param {Function} callback
 */
Confluence.prototype.getCustomContentById = function(options, callback) {
    var expanders = options.expanders || ['body.storage', 'version'];

    request
        .get(this.config.baseUrl + this.config.apiPath + "/content/" + options.id + this.config.extension + "?expand=" + expanders.join())
        .auth(this.config.username, this.config.password)
        .end(function(err, res){
            processCallback(callback, err, res);
        });
};

/**
 * Get stored content for a specific space and page title.
 *
 * @param {string} space
 * @param {string} title
 * @param {Function} callback
 */
Confluence.prototype.getContentByPageTitle = function(space, title, callback){
    var query =
        "?spaceKey=" + space +
        "&title=" + title +
        "&expand=body.storage,version";

    request
        .get(this.config.baseUrl + this.config.apiPath + "/content" + this.config.extension + query)
        .auth(this.config.username, this.config.password)
        .end(function(err, res){
            processCallback(callback, err, res);
        });

};

/**
 * Post content to a new page.
 *
 * @param {string} space
 * @param {string} title
 * @param {string} content
 * @param {number} parentId - A null value will cause the page to be added under the space's home page
 * @param {Function} callback
 * @param {string} representation - Optional
 */
Confluence.prototype.postContent = function(space, title, content, parentId, callback, representation){
    var config = this.config;
    var page = {
        "type": "page",
        "title": title,
        "space": {
            "key": space
        },
        "ancestors": [{
            "type": "page"
        }],
        "body": {
            "storage": {
                "value": content,
                "representation": representation || "storage"
            }
        }
    };

    function createPage() {
        request
            .post(config.baseUrl + config.apiPath + "/content" + config.extension)
            .auth(config.username, config.password)
            .type('json')
            .send(page)
            .end(function(err, res){
                processCallback(callback, err, res);
            });
    }

    if (!parentId) {
        this.getSpaceHomePage(space, function(err, res) {
            if (err) callback(err);
            else if (!res || !res.id) {
                callback("Can't find space home page.");
            }
            else {
                page.ancestors[0].id = res.id;
                createPage();
            }
        });
    }
    else {
        page.ancestors[0].id = parentId;
        createPage();
    }

};

/**
 * Put/update stored content for a page.
 *
 * @param {string} space
 * @param {string} id
 * @param {number} version
 * @param {string} title
 * @param {string} content
 * @param {Function} callback
 * @param {boolean} minorEdit - Optional
 * @param {string} representation - Optional
 */
Confluence.prototype.putContent = function(space, id, version, title, content, callback, minorEdit, representation){
    var page = {
        "id": id,
        "type": "page",
        "title": title,
        "space": {
            "key": space
        },
        "version": {
            "number": version,
            "minorEdit": minorEdit || false
        },
        "body": {
            "storage": {
                "value": content,
                "representation": representation || "storage"
            }
        }
    };

    request
        .put(this.config.baseUrl + this.config.apiPath + "/content/" + id + this.config.extension + "?expand=body.storage,version")
        .auth(this.config.username, this.config.password)
        .type('json')
        .send(page)
        .end(function(err, res){
            processCallback(callback, err, res);
        });

};

/**
 * Delete a page.
 *
 * @param {string} id
 * @param {Function} callback
 */
Confluence.prototype.deleteContent = function(id, callback){

    request
        .del(this.config.baseUrl + this.config.apiPath + "/content/" + id + this.config.extension)
        .auth(this.config.username, this.config.password)
        .end(function(err, res){
            callback(err, res);
        });

};

/**
 * Get attachments
 *
 * @param {string} space
 * @param {string} id
 * @param {Function} callback
 */
Confluence.prototype.getAttachments = function(space, id , callback ){
    var query =
        "?spaceKey=" + space +
        "&expand=version,container";

    request
        .get(this.config.baseUrl + this.config.apiPath + "/content/" + id + "/child/attachment" + query )
        .auth(this.config.username, this.config.password)
        .end(function(err, res){
            processCallback(callback, err, res);
        });
};

/**
 * This allows you to post attachments to the pages you create.
 *
 * @param {string} space
 * @param {string} id
 * @param {string} filepath - absolute path of the file you are sending
 * @param {Function} callback
 */
Confluence.prototype.createAttachment = function(space, id, filepath, callback ){
//https://docs.atlassian.com/atlassian-confluence/REST/latest/#content/{id}/child/attachment-getAttachments

    request
        .post(this.config.baseUrl + this.config.apiPath + "/content/" + id + "/child/attachment")
        .auth(this.config.username, this.config.password)
        .set("X-Atlassian-Token", "nocheck")
        .attach("file", filepath )
        .end(function(err, res){
            processCallback(callback, err, res);
        });
};

/**
 *  This allows you to update posted attachments data
 *
 * @param {string} space
 * @param {string} id
 * @param {string} attachmentId
 * @param {string} filepath
 * @param {Function} callback
 */
Confluence.prototype.updateAttachmentData = function(space, id, attachmentId, filepath, callback ){

    request
        .post(this.config.baseUrl + this.config.apiPath + "/content/" + id + "/child/attachment/" + attachmentId + "/data")
        .auth(this.config.username, this.config.password)
        .set("X-Atlassian-Token", "nocheck")
        .attach("file", filepath )
        .end(function(err, res){
            processCallback(callback, err, res);
        });
};

/**
 * Get labels from content
 *
 * @param {string} id
 * @param {Function} callback
 */
Confluence.prototype.getLabels = function(id , callback ){

    request
        .get(this.config.baseUrl + this.config.apiPath + "/content/" + id + "/label" )
        .auth(this.config.username, this.config.password)
        .end(function(err, res){
            processCallback(callback, err, res);
        });
};

/**
 * Post content labels to a existing page.
 *
 * @param {string} id
 * @param {Array.<{prefix:string, name:string}>} labels
 * @param {Function} callback
 */
Confluence.prototype.postLabels = function(id, labels, callback){

    request
        .post(this.config.baseUrl + this.config.apiPath + "/content/" + id + "/label")
        .auth(this.config.username, this.config.password)
        .type('json')
        .send(labels)
        .end(function(err, res){
            processCallback(callback, err, res);
        });

};

/**
 * Delete a label from a page.
 *
 * @param {string} id
 * @param {string} label
 * @param {Function} callback
 */
Confluence.prototype.deleteLabel = function(id, label, callback){

    request
        .del(this.config.baseUrl + this.config.apiPath + "/content/" + id + "/label?name=" + label)
        .auth(this.config.username, this.config.password)
        .end(function(err, res){
            callback(err, res);
        });

};

/**
 *  Search by query
 *
 * @param {string} query
 * @param {Function} callback
 */
Confluence.prototype.search = function(query, callback){

    request
        .get(this.config.baseUrl + this.config.apiPath + "/search" + this.config.extension + "?" + query)
        .auth(this.config.username, this.config.password)
        .end(function(err, res){
            processCallback(callback, err, res);
        });

};

module.exports = Confluence;
