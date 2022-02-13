const _ = require(`lodash`);
const util = require(`util`);
const fs = require(`fs`);
const carbone = require(`carbone`);
const telejson = require(`telejson`);
const express = require(`express`);
const bodyParser = require(`body-parser`);
const app = express();
const port = process.env.CARBONE_PORT || 3030;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const render = util.promisify(carbone.render);

// Flagging default formatters to remove custom ones later
_.forEach(carbone.formatters, formatter => formatter.$isDefault = true);

app.post('/render', async (req, res) => {
  let data = req.body.data;
  let options = {};
  let formatters = {};
  console.log(req.body.options);

  try {
    options = req.body.options;
  } catch (e) { }
  if (typeof data !== `object` || data === null) {
    try {
      data = JSON.parse(req.body.data);
    } catch (e) {
      data = {};
    }
  }
  try {
    formatters = telejson.parse(req.body.formatters);
  } catch (e) { }

  // Removing previous custom formatters before adding new ones
  carbone.formatters = _.filter(carbone.formatters, formatter => formatter.$isDefault === true);

  carbone.addFormatters(formatters);

  let report = null;
  let template = `../user-files/${req.body.template}`;
  let result = `../user-files/${req.body.options.outputName}`;
  try {
    report = await render(template, data, options);
  } catch (e) {
    console.log(e);
    return res.status(500).send(`Internal server error`);
  }

  fs.writeFileSync(result, report);

  if (options.asDownload) {
    res.setHeader(`Content-Disposition`, `attachment; filename=${options.outputName}`);
    res.setHeader(`Content-Transfer-Encoding`, `binary`);
    res.setHeader(`Content-Type`, `application/octet-stream`);

    return res.send(report);
  }
  else {
    return res.sendStatus(200);
  }
});

app.listen(port, () => console.log(`Carbone wrapper listenning on port ${port}!`));
