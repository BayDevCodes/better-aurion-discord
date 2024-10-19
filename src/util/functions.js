// Third-party modules
const {
  AttachmentBuilder,
  AutocompleteInteraction,
  Client,
  Collection,
  User,
} = require('discord.js'); // Elements from the discord.js library
const Gradient = require('javascript-color-gradient'); // Library to generate gradients
const QuickChart = require('quickchart-js'); // Library to generate charts

const { readdirSync } = require('fs'); // Function to read the content of a directory
const { Main, Marks, Promotion } = require('./tables'); // Database tables
const marks = require('../constants/marks.json'); // Constants regarding the marks defined at setup

/**
 * Generates a chart URL with given averages.
 * @param {String[]} names array of average names
 * @param {Number[]} values array of average values
 * @param {Number[]} promotionValues array of promotion average values
 * @param {String} scope scope of the averages (unit, module or type)
 * @param {Number[]} goals array of goals set by the student in unit scope
 * @returns {Promise<AttachmentBuilder>} chart attachment
 */
async function averagesChart(names, values, promotionValues, scope, goals = []) {
  const chart = new QuickChart(); // Create a new chart

  chart.setWidth(names.length * 250); // Give it a width based on the number of averages
  chart.setHeight(500); // Give it a height
  chart.setBackgroundColor('#2e3137'); // Set the background color (equal to Discord's dark theme)
  chart.setVersion(2); // We are using the v2 of the quickchart API

  // Create datasets and style them using Discord's colors
  const datasets = [
    {
      type: 'line',
      data: promotionValues,
      label: 'Moyennes de promo',
      backgroundColor: '#ED4245',
      borderColor: '#ED4245',
      borderWidth: 3,
      fill: false, // Keep only the line
    },
  ];
  if (goals.length)
    datasets.push({
      type: 'line',
      data: goals,
      label: 'Tes objectifs',
      backgroundColor: '#57F287',
      borderColor: '#57F287',
      borderDash: [16, 8], // Dashed line
      borderWidth: 3,
      fill: false, // Keep only the line
    });
  datasets.push({
    type: 'bar',
    data: values,
    label: 'Tes moyennes',
    backgroundColor: '#5865f2',
    borderColor: '#5865f2',
    borderWidth: 3,
    barPercentage: 1,
    categoryPercentage: 0.69, // Nice ( ͡° ͜ʖ ͡°)
  });

  // Set the chart's configuration
  chart.setConfig({
    type: 'bar',
    data: { datasets: datasets, labels: names }, // Add the datasets and labels
    options: {
      title: {
        display: true, // Hidden by default
        text: `Moyennes par ${scope}`,
        fontColor: '#fff',
        fontSize: 20,
      },
      layout: { padding: { left: 5, right: 5, top: 5, bottom: 5 } },
      legend: {
        fullWidth: true, // Display the legend on a single line
        reverse: true,
        labels: { fontColor: '#ccc', fontStyle: 'italic', fontSize: 13, padding: 10 },
      },
      scales: {
        xAxes: [
          {
            type: 'category',
            gridLines: { display: false }, // Grid lines are ugly
            ticks: {
              fontColor: '#fff',
              fontStyle: 'bold',
              fontSize: 12,
              padding: 5,
              maxRotation: 0, // Prevent the labels from being rotated
            },
            scaleLabel: {
              display: true, // Hidden by default
              labelString:
                scope[0].toUpperCase() + scope.slice(1) + (scope.slice(-1) === 's' ? '' : 's'), // Capitalize the first letter and add an 's' if needed
              fontColor: '#ccc',
              fontStyle: 'italic',
              fontSize: 13,
            },
          },
        ],
        yAxes: [
          {
            gridLines: {
              color: 'rgba(255, 255, 255, 0.42)',
              zeroLineColor: 'rgba(255, 255, 255, 0.42)',
              drawBorder: false,
              lineWidth: 1,
            },
            ticks: {
              fontColor: '#fff',
              fontStyle: 'bold',
              fontSize: 12,
              padding: 10,
              min: 0,
              max: 20,
              stepSize: 2,
            },
            scaleLabel: {
              display: true, // Hidden by default
              labelString: 'Moyennes',
              fontColor: '#ccc',
              fontStyle: 'italic',
              fontSize: 13,
            },
          },
          {
            position: 'right',
            gridLines: { display: false }, // Still ugly
            ticks: {
              fontColor: '#fff',
              fontStyle: 'bold',
              fontSize: 12,
              min: 0,
              max: 20,
              stepSize: 2,
            },
          },
        ],
      },
      plugins: {
        datalabels: {
          align: 'top',
          anchor: 'start',
          color: '#fff',
          font: { size: 12, style: 'bold' },
          backgroundColor: 'rgba(0, 0, 0, 0.42)',
          borderColor: 'rgba(0, 0, 0, 0.24)',
          borderRadius: 5, // Make the corners round
        },
      },
    },
  });

  return new AttachmentBuilder(await chart.toBinary(), { name: 'chart.png' }); // Return the chart attachment, ready to send
}

/**
 * Calculates the averages of the student.
 * @param {{ id: String, value: Number }[]} markList array of marks
 */
function calculateAverages(markList) {
  /**
   * @type {{
   *  general: Number
   *  [unitId: String]: {
   *      self: Number
   *      [moduleId: String]: {
   *          self: Number
   *          [typeId: String]: Number
   *      }
   *  }
   * }}
   */
  const averages = {}; // Initialize the averages object
  const marksToAccount = markList.filter(m => m.value >= 0); // Remove marks that are absences

  for (const unitId of Object.keys(marks.weights)) {
    const unitMarks = marksToAccount.filter(m => m.id.split('_')[0] === unitId); // Remove marks that are not in the current unit
    averages[unitId] = {}; // Initialize the unit's averages object

    for (const moduleId of Object.keys(marks.weights[unitId]).slice(1)) {
      const moduleMarks = unitMarks.filter(m => m.id.split('_')[1] === moduleId); // Remove marks that are not in the current module
      averages[unitId][moduleId] = {}; // Initialize the module's averages object

      for (const typeId of Object.keys(marks.weights[unitId][moduleId]).slice(0, -1)) {
        const typeMarks = moduleMarks.filter(m => m.id.split('_')[2] === typeId); // Remove marks that are not of the current type

        let markSum = 0; // Initialize the sum of the marks
        for (const mark of typeMarks) markSum += mark.value; // Add the current mark to the sum

        averages[unitId][moduleId][typeId] = typeMarks.length
          ? Math.round((markSum / typeMarks.length) * 100) / 100
          : null; // Calculate the average of the current type
      }

      let typeSum = 0,
        typeWeights = 0; // Initialize the sum and weights of the types
      for (const [type, average] of Object.entries(averages[unitId][moduleId])) {
        const weight = marks.weights[unitId][moduleId][type]; // Get the weight of the current type
        if (average !== null) (typeSum += average * weight), (typeWeights += weight); // Add the current type to the sum and weights
      }

      averages[unitId][moduleId].self = typeWeights
        ? Math.round((typeSum / typeWeights) * 100) / 100
        : null; // Calculate the average of the current module
    }

    let moduleSum = 0,
      moduleWeights = 0; // Initialize the sum and weights of the modules
    for (const [module, average] of Object.entries(averages[unitId])) {
      const weight = marks.weights[unitId][module].self; // Get the weight of the current module
      if (average.self !== null) (moduleSum += average.self * weight), (moduleWeights += weight); // Add the current module to the sum and weights
    }

    averages[unitId].self = moduleWeights
      ? Math.round((moduleSum / moduleWeights) * 100) / 100
      : null; // Calculate the average of the current unit
  }

  let unitSum = 0,
    unitWeights = 0; // Initialize the sum and weights of the units
  for (const [unit, average] of Object.entries(averages)) {
    const weight = marks.weights[unit].ECTS; // Get the weight of the current unit
    if (average.self !== null) (unitSum += average.self * weight), (unitWeights += weight); // Add the current unit to the sum and weights
  }

  averages.general = unitWeights ? Math.round((unitSum / unitWeights) * 100) / 100 : null; // Calculate the general average
  return averages;
}

/**
 * Generates a command mention to use in embeds.
 * @param {Client} client discord.js client
 * @param {String} command name of the command
 */
function commandMention(client, command) {
  const commandId = client.application.commands.cache.find(
    c => c.name === command.split(' ')[0]
  )?.id; // Get the command's id
  return `</${command}:${commandId ? commandId : 0}>`; // Return the command mention
}

/**
 * Returns published marks that match the user input.
 * @param {string} query
 */
async function findMatchingMarks(query) {
  const inputRegex = new RegExp(query, 'i');
  return Object.values(await Marks.all())
    .filter(mark => inputRegex.test(mark.id) | inputRegex.test(mark.value))
    .map(mark => {
      return { name: mark.value, value: mark.id };
    })
    .slice(-25); // Most recent marks
}

/**
 * Returns the possible characteristics when creating a mark.
 * @param {AutocompleteInteraction} interaction
 */
function findPossibleMarkDetails(interaction) {
  const { name, value } = interaction.options.getFocused(true);
  const inputRegex = new RegExp(value, 'i');

  let unit;
  switch (name) {
    case 'unité':
      return Object.keys(marks.weights)
        .map(unitId => {
          return { name: marks.names.units[unitId], value: unitId };
        })
        .filter(({ name, value }) => inputRegex.test(name) || inputRegex.test(value));

    case 'module':
      unit = interaction.options.getString('unité');
      if (!unit || !marks.weights[unit]) return [];

      return Object.keys(marks.weights[unit])
        .slice(1)
        .map(moduleId => {
          return { name: marks.names.modules[moduleId], value: moduleId };
        })
        .filter(({ name, value }) => inputRegex.test(name) || inputRegex.test(value));

    case 'type':
      unit = interaction.options.getString('unité');
      const module = interaction.options.getString('module');
      if (!unit || !marks.weights[unit] || !module || !marks.names.modules[module]) return [];

      return Object.keys(marks.weights[unit][module])
        .slice(0, -1)
        .map(typeId => {
          return { name: marks.names.types[typeId], value: typeId };
        })
        .filter(({ name, value }) => inputRegex.test(name) || inputRegex.test(value));
  }
}

/**
 * Generates a gradient from a color (lighter to darker variation).
 * @param {String} color color of the unit
 * @param {Number} steps amount of modules
 */
function generateGradient(color, steps) {
  if (steps === 1) return [color];

  const rgb = [];
  for (let i = 0; i < 3; i++) rgb.push(parseInt(color.slice(1 + 2 * i, 3 + 2 * i), 16)); // Convert the color to RGB

  const lightColor = `#${rgb.map(v => Math.min(0xff, Math.round(v * 1.3)).toString(16)).join('')}`; // Slighly lighter variation of the color
  const darkColor = `#${rgb.map(v => Math.min(0xff, Math.round(v * 0.7)).toString(16)).join('')}`; // Slighly darker variation

  return new Gradient().setColorGradient(lightColor, darkColor).setMidpoint(steps).getColors(); // Generate the gradient and return it
}

/**
 * Generates a mark's id & name from its components if they are valid.
 * @param {String} unitId id of the unit
 * @param {String} moduleId id of the module
 * @param {String} typeId id of the type
 * @param {Number?} number mark number
 */
function getMarkId(unitId, moduleId, typeId, number = null) {
  if (!marks.weights[unitId] || !marks.weights[unitId][moduleId] || !marks.weights[unitId][moduleId][typeId]) return null; // Return null if the mark is invalid

  return `${unitId}_${moduleId}_${typeId}${number ? `_${number}` : ''}`; // Generate the mark's id
}

/**
 * Reports an error to the application manager.
 * @param {Client} client Discord.js client
 * @param {String} error Error message
 * @param {String} user User that caused the error in case of an interaction error
 */
function handleError(client, error, user = null) {
  const owner =
    client.application.owner instanceof User // Is the application managed by an individual or a team?
      ? client.application.owner
      : client.application.owner.members.find(m => m.id === client.application.owner.ownerId).user;

  owner.send(`Erreur détectée${user ? ` avec **${user}**` : ''}:\n\`\`\`js\n${error}\n\`\`\``);
}

/**
 * Creates a new student with their default values in the database.
 * @param {String} userId Discord user id
 * @param {String} email Junia email
 */
async function initStudent(userId, email) {
  const defaultGoals = {}; // Initialize the default goals object
  for (const unitId of Object.keys(marks.weights)) defaultGoals[unitId] = 10; // Set the default goal for each unit to 10

  // Create the student's row in the database
  await Promotion.set(userId, {
    anonymous: false,
    averages: calculateAverages([]), // Calculate the averages with no marks (null everywhere)
    email: email,
    goals: defaultGoals, // Set the default goals
    marks: [], // No marks
  });
}

/**
 * Formats a name from an email.
 * @param {String} email Junia email
 */
function nameFromEmail(email) {
  const [firstName, lastName] = email.split('@')[0].split('.'); // Get the first and last names from the email
  const firsts = firstName
    .split('-')
    .map(f => f[0].toUpperCase() + f.slice(1))
    .join(' '); // Capitalize the first letters of the first names
  const lasts = lastName.replace('-', ' ').toUpperCase(); // Capitalize the last names
  return `${firsts} ${lasts}`; // Return the formatted name
}

/**
 * Calculates the minimum mark needed to get/keep an goal in a unit (can be negative if the student is a chad).
 * @param {{ averages: {
 *  [unitId: String]: {
 *      [moduleId: String]: {
 *          [typeId: String]: Number,
 *          self: Number
 *      },
 *      self: Number
 *  },
 *  general: Number
 * }, marks: { id: String, value: Number }[] }} student student object
 * @param {Number} goal // goal to reach
 * @param {String} unitId // id of the unit
 * @param {String} moduleId // id of the module
 * @param {String} typeId // id of the type
 */
function predictMark(student, goal, unitId, moduleId, typeId) {
  const newModuleWeight = marks.weights[unitId][moduleId].self; // Get the weight of the module with a new mark
  let moduleSum = 0,
    moduleWeights = newModuleWeight; // Initialize the sum and weights of the modules
  for (const [module, average] of Object.entries(student.averages[unitId])) {
    if (average?.self === null || module === moduleId || module === 'self') continue; // Skip the modules with no average, the module with a new mark and the unit average
    const weight = marks.weights[unitId][module].self; // Get the weight of the current module

    (moduleSum += average.self * weight), (moduleWeights += weight); // Add the current module to the sum and weights
  }

  // The equation to find the expected module average is:
  // (moduleSum + ? * newModuleWeight) / moduleWeights = goal
  // <=> moduleSum + ? * newModuleWeight = goal * moduleWeights
  // <=> ? * newModuleWeight = (goal * moduleWeights - moduleSum)
  // <=> ? = (goal * moduleWeights - moduleSum) / newModuleWeight
  const moduleGoal = (goal * moduleWeights - moduleSum) / newModuleWeight; // Calculate the expected module average

  const newTypeWeight = marks.weights[unitId][moduleId][typeId]; // Get the weight of the type with a new mark
  let typeSum = 0,
    typeWeights = newTypeWeight; // Initialize the sum and weights of the types
  for (const [type, average] of Object.entries(student.averages[unitId][moduleId])) {
    if (average === null || type === typeId || type === 'self') continue; // Skip the types with no average, the type with a new mark and the module average
    const weight = marks.weights[unitId][moduleId][type]; // Get the weight of the current type

    (typeSum += average * weight), (typeWeights += weight); // Add the current type to the sum and weights
  }

  // same equation as above but to find the expected type average
  const typeGoal = (moduleGoal * typeWeights - typeSum) / newTypeWeight; // Calculate the expected type average

  const marksToAccount = student.marks.filter(
    m => m.value >= 0 && m.id.startsWith(`${unitId}_${moduleId}_${typeId}`)
  ); // Get the marks to account for the type average
  if (!marksToAccount.length) return Math.round(typeGoal * 100) / 100; // If there are no marks to account for, return the expected type average

  let markSum = 0; // Initialize the sum of the marks
  for (const mark of marksToAccount) markSum += mark.value; // Add the current mark to the sum

  // The equation to find the expected mark is:
  // (markSum + ?) / markAmount = typeGoal
  // <=> markSum + ? = typegoal * markAmount
  // <=> ? = typegoal * markAmount - markSum
  return Math.round((typeGoal * (marksToAccount.length + 1) - markSum) * 100) / 100; // Calculate the expected mark and return it
}

/**
 * Starts the bot instance, loads commands & events to it and connects it to Discord and the database.
 * @param {Client} client Discord.js client
 */
async function start(client) {
  console.log('>>> starting...');

  console.log('\n>>> loading commands...');
  client.commands = new Collection(); // Initialize the commands collection

  // Get all the files in the commands folder
  readdirSync('./src/commands').forEach(file => {
    const command = require(`../commands/${file}`); // Import the command

    client.commands.set(command.data.name, command); // Add it to the commands collection
    console.log(`${command.data.name} command loaded!`);
  });

  console.log('\n>>> loading components...');
  client.components = new Collection(); // Initialize the components collection

  // Get all the files in the components folder
  readdirSync('./src/components').forEach(file => {
    const component = require(`../components/${file}`); // Import the component

    client.components.set(component.data.data.custom_id, component); // Add it to the components collection
    console.log(`${component.data.data.custom_id} component loaded!`);
  });

  console.log('\n>>> loading events...');

  // Get all the files in the events folder
  readdirSync('./src/events').forEach(file => {
    const event = require(`../events/${file}`); // Import the event

    // Add a listener to the client for the event
    if (event.once) client.once(event.name, (...args) => event.execute(...args));
    // If it is a once event, use client.once
    else client.on(event.name, (...args) => event.execute(...args)); // If it is a normal event, use client.on
    console.log(`${event.name} event loaded!`);
  });

  console.log('\n>>> connecting to APIs and websockets...');
  await client.login(process.env.BOT_TOKEN); // Connect to Discord
  await (await client.application.fetch()).commands.fetch(); // Fetch application information for the commandMention function to work

  setInterval(updatePromotionAverages, 1000 * 60 * 10); // Update promotion averages every 10 minutes
  Main.set('promotionAveragesUpdate', ~~((Date.now() + 1000 * 60 * 10) / 1000)); // Save the next update time in seconds

  console.log('-> Loaded and connected!\n');
}

/** Retrieves all the marks of the promotion, calculates the averages and saves them to the database. */
async function updatePromotionAverages() {
  Main.set('promotionAveragesUpdate', ~~((Date.now() + 1000 * 60 * 10) / 1000)); // Save the next update time, 10 minutes from "now" in seconds

  const promotionMarks = []; // Initialize the array of marks
  const students = await Promotion.all(); // Get all the students of the promotion
  for (const student of students) promotionMarks.push(...student.value.marks); // Add the marks of the current student to the array

  Main.set('promotionAverages', calculateAverages(promotionMarks)); // Calculate and save the averages to the database
}

/**
 * Generates a chart URL with general weights, unit's or module's ones.
 * @param {String} unitId id of the unit
 * @param {String} moduleId id of the module
 * @returns {String} chart URL
 */
function weightsChart(unitId = null, moduleId = null) {
  // Get the colors of types, modules or units
  const colors = moduleId
    ? marks.colors.types
    : unitId
    ? generateGradient(marks.colors[unitId], Object.keys(marks.weights[unitId]).length - 1)
    : Object.keys(marks.weights).map(unitId => marks.colors[unitId]);

  // Get the weights of types, modules or units
  const data = moduleId
    ? Object.keys(marks.weights[unitId][moduleId])
        .slice(0, -1)
        .map(type => marks.weights[unitId][moduleId][type])
    : unitId
    ? Object.keys(marks.weights[unitId])
        .slice(1)
        .map(moduleId => marks.weights[unitId][moduleId].self)
    : Object.keys(marks.weights).map(unitId => marks.weights[unitId].ECTS);

  // Get the names of types, modules or units
  const labels = moduleId
    ? Object.keys(marks.weights[unitId][moduleId])
        .slice(0, -1)
        .map(type => marks.names.types[type])
    : unitId
    ? Object.keys(marks.weights[unitId])
        .slice(1)
        .map(moduleId => marks.names.modules[moduleId])
    : Object.keys(marks.weights).map(unitId => marks.names.units[unitId]);

  const chart = new QuickChart(); // Create a new chart

  chart.setWidth(1000); // Give it a width
  chart.setHeight(500); // Give it a height
  chart.setBackgroundColor('#2e3137'); // Set the background color (equal to Discord's dark theme)
  chart.setVersion(2); // We are using the v2 of the quickchart API

  // Set the chart's configuration
  chart.setConfig({
    type: 'outlabeledPie',
    data: {
      labels: labels, // Add names
      datasets: [
        {
          backgroundColor: colors, // Add colors
          borderColor: '#000',
          borderWidth: 2,
          data: data, // Add weights
        },
      ],
    },
    options: {
      cutoutPercentage: 50,
      legend: { display: false }, // Hide the legend
      plugins: {
        outlabels: {
          text: moduleId ? 'Pondération %p\n%l' : unitId ? 'Coeff %v (%p)\n%l' : '%v ECTS (%p)\n%l', // Set the text
          borderColor: '#000',
          borderRadius: 10,
          borderWidth: 2,
          lineColor: '#000',
          stretch: 50,
          color: '#000',
          font: { style: 'bold' },
          padding: { right: 8, left: 8 },
        },
      },
    },
  });

  return chart.getUrl(); // Return the chart's URL (not promised because it is short enough)
}

// Export all the functions to be used in other files
module.exports = {
  averagesChart,
  calculateAverages,
  commandMention,
  findMatchingMarks,
  findPossibleMarkDetails,
  getMarkId,
  handleError,
  initStudent,
  nameFromEmail,
  predictMark,
  start,
  weightsChart,
};
