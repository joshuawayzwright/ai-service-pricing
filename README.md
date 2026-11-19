# AI Service Pricing Planner

Work out the hourly and day rate you actually need as an Australian sole trader, once super, business costs, time off and unpaid admin time are counted. Then price a job from that rate.

**[Open the app](https://joshuawayzwright.github.io/ai-service-pricing/)**

## Features

- Hourly rate from your income goal, super, yearly costs and a profit buffer
- Counts weeks off and the share of your hours that customers actually pay for
- Day rate, and prices with GST if you're registered
- Rounds your hourly rate up to the nearest $5
- Prices a single job from hours, materials, markup and a call-out fee
- Warns you when your turnover target reaches the $75,000 GST registration threshold
- An AI prompt that builds three packages and pricing wording around your rate, without lowering it
- Copy or print your summary

## How the rate is worked out

```
turnover needed = (income + income × super rate + yearly costs) × (1 + buffer)
billable hours  = (52 − weeks off) × hours per week × billable %
hourly rate     = turnover needed ÷ billable hours
```

Super defaults to 12%, the same as the Superannuation Guarantee rate employers pay. Sole traders don't have to pay themselves super, but planning for it is safer.

## Privacy

Everything runs in your browser. The app has no server, accounts, cookies, analytics or tracking, and it doesn't send what you type anywhere. Nothing is saved: close the tab and it's gone. A strict Content Security Policy blocks the page from loading anything from other sites.

## What "AI" means here

This app **doesn't call an AI model**. It does the maths and structure itself, then gives you a ready-to-paste prompt for the AI assistant you already use (ChatGPT, Claude, Gemini and so on). The prompt tells the assistant not to change your numbers.

## Run it yourself

No build step and no dependencies.

```bash
git clone https://github.com/joshuawayzwright/ai-service-pricing.git
cd ai-service-pricing
python3 -m http.server 8080   # then open http://localhost:8080
```

You can also just open `index.html` in a browser.

## Tests

```bash
npm test      # or: node --test "tests/*.test.js"
```

The tests cover the calculation logic in `lib.js`. CI runs them on every push and pull request.

## Files

| File | What it does |
|---|---|
| `index.html` | The page |
| `lib.js` | Calculations and text output (pure functions, tested) |
| `app.js` | Connects the form to `lib.js` |
| `style.css` | Styles, light and dark mode, print layout |
| `tests/` | Unit tests (Node's built-in test runner) |

## Licence

[MIT](LICENSE). Made by [Joshua Wright](https://github.com/joshuawayzwright) for [The Solo Service Provider](https://thesoloserviceprovider.com.au/), which has more toolkits for sole traders.

This is a planning aid, not legal, tax or financial advice.
