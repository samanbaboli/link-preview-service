const fastify = require('fastify')({
    logger: true
})
const cheerio = require("cheerio");
const request = require("request");

const getByProperty = ($, property) =>
    $(`meta[property='${property}']`).first().attr("content") || null;

// check the og tags of taget website for excract data
function checkMetaTags($, url) {
    const result = {
        url,
        image: getByProperty($, "og:image"),
        title: getByProperty($, "og:title"),
        description: getByProperty($, "og:description"),
        siteName: getByProperty($, "og:site_name"),
    };
    return Promise.resolve(result);
}


const errorMaker = url => ({
    url,
    image: null,
    title: undefined,
    description: null,
    siteName: null
});


function linkPreview(url, timeout = 5000) {

    if (!url.match(/^http(s)?:\/\/[a-z]+\.[a-z]+(.)+/i)) {
        return Promise.reject({
            message: "Please send a valid url"
        });
    }
    return linkPreview.makeRequest(url, timeout).then(({
        response,
        body
    }) => {
        if (!response) return errorMaker(url);
        if (response.statusCode === 200) {
            return checkMetaTags(cheerio.load(body), url);
        }
        return errorMaker(url);
    });
}


linkPreview.makeRequest = (url, timeout) =>
    new Promise((resolve, reject) => {
        request(url, {
            timeout: timeout
        }, (error, response, body) => resolve({
            body,
            response
        }));
    });



fastify.route({
    method: 'GET',
    url: '/',
    schema: {
        querystring: {
            url: {
                excitement: {
                    type: 'string'
                },
                type: 'string'
            }

        }
    },
    handler: function (request, reply) {
        linkPreview(request.query.url).then(response => {
            reply.send({
                linkPreviewData: response
            })
        }).catch(function (err) {
            reply.send({
                success: false,
                message: err.message

            })
        })

    }
})

// Run the server!
const start = async () => {
    try {
        await fastify.listen(3000)
        fastify.log.info(`server listening on ${fastify.server.address().port}`)
    } catch (err) {
        fastify.log.error(err)
        process.exit(1)
    }
}
start()