const authOrderModel = require('../../models/authOrder')
const customerOrder = require('../../models/customerOrder')

const myShopWallet = require('../../models/myShopWallet')
const sellerWallet = require('../../models/sellerWallet')

const cartModel = require('../../models/cartModel')
const moment = require("moment")
const { responseReturn } = require('../../utilities/response')
const { mongo: {ObjectId}} = require('mongoose')
const stripe = require('stripe')('sk_test_51RIaNr4ZvLDdG4ul8HdWEWnZCcknJZi3erFJK2zYoixwHc8kh7TxHZRPhY0vabVDF3W1VifnYa4PhZnqfX5Ld4Ce00W2FnT0E1')

class orderController{
//Vásárló fizetett állapotának ellenőrzése metódus
 paymentCheck = async (id) => {
  try {
    const order = await customerOrder.findById(id)
     if (order.payment_status === 'fizetetlen') {
      await customerOrder.findByIdAndUpdate(id,{
        delivery_status: 'törölve'
        })
    await authOrderModel.updateMany({
      orderId: id
      },{
        delivery_status: 'törölve'
      })
     }
     return true
    } catch (error) {
       console.log(error)
    }
 }
//Vásárló fizetett állapotának ellenőrzése metódus vége
//Rendelés leadása metódus
 place_order = async(req,res) => {
  const {price,products,shipping_fee,shippingInfo,userId} = req.body
  let authorOrderData = []
  let cartId = []
//dátumbélyegző hozzáadása
  const tempDate = moment(Date.now()).locale("hu").format('LLL');
  let customerOrderProduct = []

  for (let i = 0; i < products.length; i++) {
    const pro = products[i].products
    for (let j = 0; j < pro.length; j++) {
        const tempCusPro = pro[j].productInfo;
        tempCusPro.quantity = pro[j].quantity
        customerOrderProduct.push(tempCusPro)
        if (pro[j]._id) {
         cartId.push(pro[j]._id)
        }
    }
  }
 try {
    const order = await customerOrder.create({
     customerId: userId, shippingInfo,
     products: customerOrderProduct,
     price: price + shipping_fee,
     payment_status: 'fizetetlen',
     delivery_status: 'függőben',
     date: tempDate
    })
    for (let i = 0; i < products.length; i++) {
      const pro = products[i].products
      const pri = products[i].price
      const sellerId = products[i].sellerId
      let storePro = []
       for (let j = 0; j < pro.length; j++) {
        const tempPro = pro[j].productInfo
        tempPro.quantity = pro[j].quantity
        storePro.push(tempPro)
       }
       authorOrderData.push({
        orderId: order.id, sellerId,
        products: storePro,
        price: pri,
        payment_status: 'fizetetlen',
        shippingInfo: 'Feca raktára',
        delivery_status: 'függőben',
        date: tempDate
      })
    }
//kosár ürítése rendelés leadásakor
  await authOrderModel.insertMany(authorOrderData)
   for (let k = 0; k < cartId.length; k++) {
    await cartModel.findByIdAndDelete(cartId[k])  
    }
//fizetési határidő ellenőrzése az adott rendelés azonosítóhoz
    setTimeout(() => {
        this.paymentCheck(order.id)
    }, 15000)
 responseReturn(res,200,{message: "Rendelés sikeresen elküldve!", orderId: order.id})
 } catch (error) {
    console.log(error.message)
  }
 }
//Rendelés leadása metódus vége
//Vásárlói adatok lekérése irányítópulthoz metódus eleje
get_customer_dashboard_data = async(req,res) => {
  const {userId} = req.params
  try {
    const recentOrders = await customerOrder.find({
      customerId: new Object(userId)
    }).limit(5)
    const pendingOrder = await customerOrder.find({
      customerId: new Object(userId),delivery_status: 'függőben'
    }).countDocuments()
    const totalOrder = await customerOrder.find({
      customerId: new Object(userId)
    }).countDocuments()
    const cancelledOrder = await customerOrder.find({
      customerId: new Object(userId),delivery_status: 'törölve'
    }).countDocuments()
    responseReturn(res,200,{
      recentOrders,
      pendingOrder,
      totalOrder,
      cancelledOrder
    })
  } catch (error) {
    console.log(error.message)
  }
}
//Vásárlói adatok lekérése irányítópulthoz metódus vége
//Rendelési adatok lekérése irányítópulthoz metódus
  get_orders = async (req, res) => {
    const {customerId, status} = req.params
    try {
      let orders = []
      if (status  !== 'mind') {
        orders = await customerOrder.find({
          customerId: new ObjectId(customerId),
          delivery_status: status
        })
      } else {
        orders = await customerOrder.find({
          customerId:  new ObjectId(customerId)
        })
      }
      responseReturn(res,200,{
        orders
      })
    } catch (error) {
      console.log(error.message)
    }
  }
//Rendelési adatok lekérése irányítópulthoz metódus vége
//Adott rendelési adat lekérése irányítópulthoz metódus
get_order_details = async (req, res) => {
  const {orderId} = req.params
  try {
    const order = await customerOrder.findById(orderId)
    responseReturn(res,200, {
      order
    })
  } catch (error) {
    console.log(error.message)
  }
}
//Adott rendelési adat lekérése irányítópulthoz metódus vége
//Admin rendelések metódus
get_admin_orders = async(req, res) => {
  let {page,searchValue,parPage} = req.query
  page = parseInt(page)
  parPage= parseInt(parPage)
  const skipPage = parPage * (page - 1)

try {
  if (searchValue) {
      
  } else {
  const orders = await customerOrder.aggregate([
  {
  $lookup: {
  //authororders gyűjtemény _id-ja egyezzen meg
    from: 'authororders',
    localField: "_id",
  //customOrders gyűjtemény orderId-val
    foreignField: 'orderId',
  //adatok begyűjtése 'suborder' név alatt
    as: 'suborder'
  }
  }
  ]).skip(skipPage).limit(parPage).sort({ createdAt: -1})
  //összes rendelés megjelenítése
  const totalOrder = await customerOrder.aggregate([
  {
    $lookup: {
      from: 'authororders',
      localField: "_id",
      foreignField: 'orderId',
      as: 'suborder'
    }
  }
])
  responseReturn(res,200, { orders, totalOrder: totalOrder.length })
}
  } catch (error) {
      console.log(error.message)
  } 
}
//Admin rendelések metódus vége
//Admin - részletes rendelés adatai metódus
get_admin_order = async(req, res) => {
  const {orderId} = req.params
  try {
  //egyeztessük az _id-t a customerOrder táblából az orderId-val
    const order = await customerOrder.aggregate([
      {
        $match: {_id: new ObjectId(orderId) }
      },
      {
        $lookup: {
          from: 'authororders',
          localField: "_id",
          foreignField: 'orderId',
          as: 'suborder'
        }
      }
    ])
    responseReturn(res,200, {order: order[0]})
  } catch (error) {
    console.log('Lekérdezési hiba az admin részletes rendeléseknél:' + error.message)
  }
}
//Admin - részletes rendelés adatai metódus vége
//Admin - rendelések állapotának frissítése metódus
admin_order_status_update = async(req,res) => {
  const {orderId} = req.params
  const {status} = req.body
  try {
    await customerOrder.findByIdAndUpdate(orderId,{delivery_status: status})
    responseReturn(res,200, {message: 'Rendelési állapot sikeresen módosítva!'})
  } catch (error) {
    console.log('Lekérdezési hiba Admin állapotok beállításánál:' + error.message)
    responseReturn(res,500, {message: 'Belső szerverhiba!'})
  }
}
//Admin - rendelések állapotának frissítése metódus vége
//Eladó - rendelések metódus
get_seller_orders = async(req,res) => {
  const {sellerId} = req.params
  let {page,searchValue,parPage} = req.query
  page = parseInt(page)
  parPage= parseInt(parPage)
  const skipPage = parPage * (page - 1)

 try {
  if (searchValue) {
     
  } else {
   const orders = await authOrderModel.find({
      sellerId
    }).skip(skipPage).limit(parPage).sort({ createdAt: -1})
    const totalOrder = await authOrderModel.find({
      sellerId
    }).countDocuments()
    responseReturn(res,200,{orders,totalOrder})
  }
 } catch (error) {
  console.log('Lekérdezési hiba az eladói rendeléseknél:' + error.message)
  responseReturn(res,500, {message: 'Belső szerverhiba!'})
  }
}
//Eladó - rendelések metódus vége
//Eladó - részletes rendelés adatai metódus
get_seller_order = async(req, res) => {
  const {orderId} = req.params
  try {
    const order = await authOrderModel.findById(orderId)
    responseReturn(res,200,{ order })
  } catch (error) {
    console.log('Lekérdezési hiba az eladói részletes rendeléseknél:' + error.message)
  }
 }
//Eladó - részletes rendelés adatai metódus vége
//Eladó - rendelések állapotának frissítése metódus
seller_order_status_update = async(req,res) => {
  const {orderId} = req.params
  const {status} = req.body

  try { 
  await authOrderModel.findByIdAndUpdate(orderId,{delivery_status: status})
  responseReturn(res,200, {message: 'Rendelési állapot sikeresen módosítva!'})
} catch (error) {
  console.log('Lekérdezési hiba eladói állapotok beállításánál:' + error.message)
  responseReturn(res,500, {message: 'Belső szerverhiba!'})
  }
}
//Eladó - rendelések állapotának frissítése metódus vége
//Vásárló - Megrendelés kifizetése metódus
create_payment = async (req,res) => {
  const {price} = req.body
  try {
    const payment = await stripe.paymentIntents.create({
      amount: price * 100,
      currency: 'HUF',
      automatic_payment_methods: {
        enabled: true
      }
    })
    responseReturn(res, 200, {clientSecret: payment.client_secret})
  } catch (error) {
    console.log(error.message)
  }
}
//Vásárló - Megrendelés kifizetése metódus vége
//Vásárló - Kifizetés megerősítése metódus
 order_confirm = async(req,res) => {
  const {orderId} = req.params
  try {
  //customerOrder táblában frissítjük a payment_status-t
    await customerOrder.findByIdAndUpdate(orderId, {payment_status:'fizetve'})
  //authOrder táblában frissítjük a payment_status-t és a delivery_status-t
    await authOrderModel.updateMany({ orderId: new ObjectId(orderId)},{
      payment_status: 'fizetve',
      delivery_status: 'függőben'
    })
  //orderId lekérése a customerOrder és az authOrderModel táblákból
    const cuOrder = await customerOrder.findById(orderId)
    const auOrder = await authOrderModel.find({
      orderId: new ObjectId(orderId)
    })
  //részidő beállítása ('l' formátum = 05.01.2025.)
  const time = moment(Date.now()).format('l');
  const splitTime = time.split('/')
//táblák létrehozása (myShopWallet, sellerWallet)
  await myShopWallet.create({
    amount: cuOrder.price,
    month: splitTime[0], //megadjuk a hónapot 0. indexű tömbelem
    year: splitTime[2] //megadjuk az évet 2. indexű tömbelem
  })
  //Eladó
  for (let i = 0; i < auOrder.length; i++) {
    await sellerWallet.create({
      sellerId: auOrder[i].sellerId.toString(),
      amount: auOrder[i].price,
      month: splitTime[0],
      year: splitTime[2]
    })
   }
   responseReturn(res,200, {message: 'Siker'})
  } catch (error) {
    console.log(error.message)
  }
  
 }
//Vásárló - Kifizetés megerősítése metódus vége
}

module.exports = new orderController()