/**
 * Description: Pastes the contents of your clipboard into a file named by the timestamp
 */
import { format } from "date-fns"

const date = format(new Date(), "yyyy-MM-dd-hh-mm-ss")
const fileName = date + ".md"

const template = `
Your pasted contents are here:
${paste()}
`.trim()

let confirm = await prompt({
  name: "value",
  type: "confirm",
  message: `This script creates a file named "${fileName}"
  with your clipboard contents in your current directory.
  Continue?`,
})

console.log(confirm)

if (confirm.value) {
  await writeFile(fileName, template)
  editor(fileName)
}