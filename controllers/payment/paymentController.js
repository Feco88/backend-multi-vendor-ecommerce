const stripeModel = require('../../models/stripeModel')
const sellerModel = require('../../models/sellerModel')

const sellerWallet = require('../../models/sellerWallet')
const withdrawRequest = require('../../models/withdrawRequest')

const {v4: uuidv4} = require('uuid') //{v4:uuidv4}
const stripe = require('stripe')('sk_test_51RIaNr4ZvLDdG4ul8HdWEWnZCcknJZi3erFJK2zYoixwHc8kh7TxHZRPhY0vabVDF3W1VifnYa4PhZnqfX5Ld4Ce00W2FnT0E1')
const { responseReturn } = require('../../utilities/response')
const { mongo: {ObjectId}} = require('mongoose')

class paymentController{
/*
  create_stripe_connect_account = async (req, res) => {
    const { id } = req;
    const uid = uuidv4();
  
    try {
      // Ellenőrizzük, van-e már Stripe fiók az eladóhoz
      let stripeInfo = await stripeModel.findOne({ sellerId: id });
  
      // Ha nincs, létrehozunk egy új Stripe fiókot
      if (!stripeInfo) {
        const account = await stripe.accounts.create({ type: 'express' });
  
        stripeInfo = await stripeModel.create({
          sellerId: id,
          stripeId: account.id,
          code: uid,
        });
      }
  
      // Új onboarding link generálása a meglévő (vagy most létrehozott) fiókhoz
      const accountLink = await stripe.accountLinks.create({
        account: stripeInfo.stripeId,
        refresh_url: 'http://localhost:3001/refresh',
        return_url: `http://localhost:3001/success?activeCode=${stripeInfo.code}`,
        type: 'account_onboarding',
      });
  
      responseReturn(res, 201, { url: accountLink.url });
    } catch (error) {
      console.error('Stripe csatlakozási hiba:', error.message);
      responseReturn(res, 500, { message: 'Stripe fiók létrehozása sikertelen.' });
    }
  };
*/

//Eladó - Profilom aloldal, stripe csatlakozás létrehozása metódus
  create_stripe_connect_account = async(req,res) => {
    const {id} = req
    const uid = uuidv4()
 //a 'stripes' táblában létezik -e az eladói Id a 'Profilom' aloldalon kattintáskor
  try {
    const stripeInfo = await stripeModel.findOne({ sellerId: id})    
 //ha létezik a felhasználó azaz van 'stripeInfo'
    if (stripeInfo) {
 //akkor törölje az adatokat, ha megegyezik a sellerId és az id
     await stripeModel.deleteOne({ sellerId: id })
 //utána hozza újra létre a 'stripe' adatokat
     const account = await stripe.accounts.create({ type: 'express' })
 //link létrehozása a stripe-adatokhoz (account Id-hoz hozzáférés)
     const accountLink = await stripe.accountLinks.create({ 
      account: account.id,
 //refresh-URL és visszatérő(return)-URL elkészítése
      refresh_url: 'http://localhost:3001/refresh',
      return_url: `http://localhost:3001/success?activeCode=${uid}`,
      type: 'account_onboarding'
      })
 //a 'stripes' táblában hozza létre az alábbi mezőket
      await stripeModel.create({
        sellerId: id,
        stripeId: account.id,
        code: uid
      })
      responseReturn(res, 201, {url: accountLink.url })
    } else{
      const account = await stripe.accounts.create({ type: 'express' })
      const accountLink = await stripe.accountLinks.create({ 
       account: account.id,
         refresh_url: 'http://localhost:3001/refresh',
         return_url: `http://localhost:3001/success?activeCode=${uid}`,
         type: 'account_onboarding'
        })
      await stripeModel.create({
        sellerId: id,
        stripeId: account.id,
        code: uid
      })
      responseReturn(res, 201, {url: accountLink.url })
    }
  } catch (error) {
     console.log('Stripe csatlakozási hiba!' + error.message)
  }
 }
//Eladó - Profilom aloldal, stripe csatlakozás létrehozása metódus vége
//Eladó - aktív fizetési fiók metódus
 active_stripe_connect_account = async(req,res) => {
  const {activeCode} = req.params
  const {id} = req
  try {
    //a kód és az aktív kód egyezzen meg a 'stripes' táblában
    const userStripeInfo = await stripeModel.findOne({code: activeCode})
    //ha megegyeznek, akkor
    if (userStripeInfo) {
    //frissítse a 'sellers' táblában a payment mezőt
       await sellerModel.findByIdAndUpdate(id,{
       payment: 'active' //active    
       })
       responseReturn(res,200,{message: 'Fizetési fiók sikeresen aktiválva!'})
    } else {
        responseReturn(res,404, {message: 'Sikertelen aktiválás!'})
    }
  } catch (error) {
    responseReturn(res,500, {message: 'Belső szerverhiba!'})
  }
 }
//Eladó - aktív fizetési fiók metódus vége
//Eladó - Kifizetések aloldal metódus
 //Eladóhoz tartozó összes eladás kiszámítása (több eladás esetén 'data')
sumAmount = (data) => {
  let sum = 0
  for (let i = 0; i < data.length; i++) {
    sum = sum + data[i].amount;
  }
  return sum;
}
 get_seller_payment_details = async(req,res) => {
 const {sellerId} = req.params
  try {
  //a 'sellerwallets' táblában megkeressük az Eladó ID-t
    const payments = await sellerWallet.find({sellerId})
 //'függőben' státuszú kérések  
 const pendingWithdraws = await withdrawRequest.find({
  $and: [
    {
     sellerId: {
        $eq: sellerId
        }
    },
    {
      status: {
        $eq: 'függőben'
        }
    }
  ]
})
  //'sikeres' státuszú kérések
 const successWithdraws = await withdrawRequest.find({
  $and: [
    {
     sellerId: {
        $eq: sellerId
        }
    },
    {
      status: {
        $eq: 'teljesítve'
        }
    }
  ]
})
  //'függőben' és 'sikeres' állapotú összegek, és 'összes eladás'
  const pendingAmount = this.sumAmount(pendingWithdraws)
  const withdrawAmount = this.sumAmount(successWithdraws)
  const totalAmount = this.sumAmount(payments)
  //maradék összeg (Elérhető összeg) kiszámítása
  let availableAmount = 0;
  if (totalAmount > 0) {
    availableAmount = totalAmount - (pendingAmount + withdrawAmount)
  }
  responseReturn(res,200, {
    totalAmount,
    pendingAmount,
    withdrawAmount,
    availableAmount,
    pendingWithdraws,
    successWithdraws
  })
  } catch (error) {
    console.log(error.message)
  }
 }
//Eladó - Kifizetések aloldal metódus vége
//Eladó - Kifizetési kérelmek metódus
withdrawal_request = async(req,res) => {
  //adatok lekérése a req.body-ból
  const {amount,sellerId} = req.body
  try {
    const withdrawal = await withdrawRequest.create({
      sellerId,
      //a szöveg összeget átalakítjuk számmá
      amount: parseInt(amount)
    })
    responseReturn(res,200,{ withdrawal, message: 'Kifizetési kérelem elküldve!' })
  } catch (error) {
    responseReturn(res,500,{message:'Belső szerverhiba!'})
  }
}
//Eladó - Kifizetési kérelmek  metódus vége
//Admin - Fizetési kérelem teljesítése metódus
get_payment_request = async(req,res) => {
  try {
    const withdrawalRequest = await withdrawRequest.find({status:'függőben'})
    responseReturn(res,200, {withdrawalRequest})
  } catch (error) {
    responseReturn(res,500,{message: 'Belső szerverhiba!'})
  }
}
//Admin - Fizetési kérelem teljesítése metódus vége
//Admin - Fizetési kérelem jóváhagyása metódus
payment_request_confirm = async(req,res) => {
  const {paymentId} = req.body
  try {
    const payment = await withdrawRequest.findById(paymentId)
    const {stripeId} = await stripeModel.findOne({
      sellerId: new ObjectId(payment.sellerId)
    })
    await stripe.transfers.create({
    //a 'withdrawrequests' tábla amount mezője
      amount: payment.amount * 100,
      currency: 'HUF',
      destination: stripeId
    })
    //withdrawRequest' táblában frissítjük az állapotot
    await withdrawRequest.findByIdAndUpdate(paymentId,{status: 'teljesítve'})
    responseReturn(res,200,{payment, message: 'Kérelem sikeresen jóváhagyva!'})
  } catch (error) {
    console.log(error)
    responseReturn(res,500,{message: 'Belső szerverhiba!'})
  }
 }
//Admin - Fizetési kérelem jóváhagyása metódus vége
}

module.exports = new paymentController()
