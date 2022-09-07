require("dotenv").config()

const express = require("express")
const app = express()
//use ejs as the frontend 
app.set("view engine", "ejs")
//set up the public folder for static file
app.use(express.static("public"))
app.use(express.json())

const paypal = require("@paypal/checkout-server-sdk")
//if production? then LIVE 
const Environment =
  process.env.NODE_ENV === "production"
    ? paypal.core.LiveEnvironment
    : paypal.core.SandboxEnvironment
//set up paypalClient with credentials 
const paypalClient = new paypal.core.PayPalHttpClient(
  new Environment(
    process.env.PAYPAL_CLIENT_ID,
    process.env.PAYPAL_CLIENT_SECRET
  )
)

const storeItems = new Map([
  [1, { price: 100, name: "Learn React Today" }],
  [2, { price: 200, name: "Learn CSS Today" }],
])

app.get("/", (req, res) => {
  res.render("index", {
    paypalClientId: process.env.PAYPAL_CLIENT_ID,
  })
})

app.post("/create-order", async (req, res) => {
  const request = new paypal.orders.OrdersCreateRequest()
  //get total amount charge 
  const total = req.body.items.reduce((sum, item) => {
    return sum + storeItems.get(item.id).price * item.quantity
  }, 0)
  //this is for the window that opens when user click 
  request.prefer("return=representation")
  
  // set parameters for Capture method 
  // this whole request will be used for this transaction 
  request.requestBody({
    intent: "CAPTURE",
    purchase_units: [
      {
        //return amount and items details as below
        //shows the total amount 
        amount: {
          currency_code: "USD",
          value: total,
          breakdown: {
            item_total: {
              currency_code: "USD",
              value: total,
            // description can be added 
            },
          },
        },
        // add all items for charge 
        items: req.body.items.map(item => {
          const storeItem = storeItems.get(item.id)
          return {
            name: storeItem.name,
            unit_amount: {
              currency_code: "USD",
              value: storeItem.price,
            },
            quantity: item.quantity,
          }
        }),
      },
    ],
  })

  try {
    //send order
    const order = await paypalClient.execute(request)
    res.json({ id: order.result.id })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.listen(3000)
