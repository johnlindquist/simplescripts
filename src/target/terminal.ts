import { assignPropsTo } from "../utils.js"

let { default: enquirer } = (await import(
  "enquirer"
)) as any

global.kitPrompt = async (config: any) => {
  if (config?.choices) {
    config = { ...config, type: "autocomplete" }
  }
  config = { type: "input", name: "value", ...config }

  if (typeof config.choices === "function") {
    let f = config.choices

    if (config.choices.length === 0) {
      let choices = config.choices()
      if (typeof choices?.then === "function")
        choices = await choices
      choices = choices.map(({ name, value }) => ({
        name,
        value,
      }))
      config = {
        ...config,
        choices,
      }
    } else {
      let suggest = global._.debounce(async function (
        input
      ) {
        let results = await f(
          input.replace(/[^0-9a-z]/gi, "")
        )
        this.choices = await this.toChoices(results)
        await this.render()

        return this.choices
      },
      250)
      config = {
        ...config,
        choices: [],
        suggest,
      }
    }
  }

  let promptConfig = {
    ...config,
    message: config.placeholder,
  }

  // TODO: Strip out enquirer autocomplete

  let { prompt } = enquirer
  let result = (await prompt(promptConfig)) as any

  return result.value
}

global.arg = async (messageOrConfig = "Input", choices) => {
  let firstArg = global.args.length
    ? global.args.shift()
    : null
  if (firstArg) {
    let valid = true
    if (
      typeof messageOrConfig !== "string" &&
      messageOrConfig?.validate
    ) {
      let { validate } = messageOrConfig
      let validOrMessage = await validate(firstArg)
      if (
        typeof validOrMessage === "string" ||
        !validOrMessage
      ) {
        valid = false
      }
    }

    if (valid) {
      return firstArg
    }
  }

  let config: PromptConfig = { placeholder: "" }

  if (typeof messageOrConfig === "string") {
    config.placeholder = messageOrConfig
  } else {
    config = messageOrConfig
  }

  config.choices = choices
  let input = await global.kitPrompt(config)

  return input
}

let { default: minimist } = (await import(
  "minimist"
)) as any

global.args = []
global.updateArgs = arrayOfArgs => {
  let argv = minimist(arrayOfArgs)

  global.args = [...global.args, ...argv._]
  global.argOpts = Object.entries(argv)
    .filter(([key]) => key != "_")
    .flatMap(([key, value]) => {
      if (typeof value === "boolean") {
        if (value) return [`--${key}`]
        if (!value) return [`--no-${key}`]
      }
      return [`--${key}`, value]
    })

  assignPropsTo(argv, global.arg)
}
global.updateArgs(process.argv.slice(2))

let terminalInstall = async packageName => {
  if (!global.arg?.trust) {
    let installMessage = global.chalk`\n{green ${global.kitScript}} needs to install the npm library: {yellow ${packageName}}`
    let downloadsMessage = global.chalk`{yellow ${packageName}} has had {yellow ${
      (
        await get(
          `https://api.npmjs.org/downloads/point/last-week/` +
            packageName
        )
      ).data.downloads
    }} downloads from npm in the past week`
    let packageLink = `https://npmjs.com/package/${packageName}`
    let readMore = global.chalk`
  Read more about {yellow ${packageName}} here: {yellow ${packageLink}}
  `
    echo(installMessage)
    echo(downloadsMessage)
    echo(readMore)
    let message = global.chalk`Do you trust {yellow ${packageName}}?`
    let config: PromptConfig = {
      placeholder: message,
      choices: [
        { name: "Yes", value: true },
        { name: "No", value: false },
      ],
    }
    let trust = await global.kitPrompt(config)
    if (!trust) {
      echo(`Ok. Exiting...`)
      exit()
    }
  }
  echo(
    global.chalk`Installing {yellow ${packageName}} and continuing.`
  )
  await global.cli("install", packageName)
}

let { createNpm } = await import("../api/npm.js")
global.npm = createNpm(terminalInstall)

global.getBackgroundTasks = async () => ({
  channel: "",
  tasks: [],
})

global.getSchedule = async () => ({
  channel: "",
  schedule: [],
})

global.getScriptsState = async () => ({
  channel: "",
  tasks: [],
  schedule: [],
})