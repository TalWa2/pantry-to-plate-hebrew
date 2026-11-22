# Pantry To Plate Hebrew

Build a responsive web app called “מה יש במקרר?” (“What’s in the Fridge?”). The app helps users decide what to cook using ingredients they already have at home.

Create a single-page interface in Hebrew with right-to-left (RTL) layout. Include the app title, a text field for ingredients, and a button labeled “תציע לי מה להכין”. Let users separate ingredients with commas or line breaks. Use “ביצים, עגבניות, גבינה, טורטיות” as the placeholder. The ingredient list is the only input.

When the user clicks the button, use Lovable AI to generate meal suggestions in Hebrew based on the ingredients entered. Display up to three distinct meals in each time range, for a total of up to nine suggestions:

- Up to 30 minutes

- 31–60 minutes

- 61–90 minutes

Use the estimated total time, including cooking or baking, to place each meal in exactly one group. Each recipe card should show the dish name, estimated total time in minutes, the ingredients needed from the user’s list, and short numbered instructions.

Each recipe may use a subset of the ingredients entered. Use only ingredients from the user’s list and avoid duplicate dishes. If fewer than three suitable recipes are available in a time range, show the ones that fit and briefly explain why there are fewer suggestions.

While generating suggestions, display “מחפשים מה אפשר להכין…” and disable the button. If the input is empty, ask the user to enter at least one ingredient. If generation fails, display an error message in Hebrew and let the user retry without clearing their ingredients.

Use a light background, a prominent green button, and readable recipe cards grouped by time range. Display the results below the input on the same page. The first version should require no sign-up and should not save recipe history.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://pantry-to-plate-hebrew.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/2f1e1639-bf9b-46c5-91c9-09ff2b2bf83f).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
