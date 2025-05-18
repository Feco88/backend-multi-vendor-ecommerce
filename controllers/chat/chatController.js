const sellerModel = require('../../models/sellerModel')
const customerModel = require('../../models/customerModel')
const sellerCustomerModel = require('../../models/chat/sellerCustomerModel')
const sellerCustomerMessage = require('../../models/chat/sellerCustomerMessage')
const adminSellerMessage = require('../../models/chat/adminSellerMessage')
const { responseReturn } = require("../../utilities/response")

class chatController{

//felhasználó-eladó hozzáadása a chat-hez metódus
 add_customer_friend = async (req,res) => {
 //szükségünk van az Eladói és a Vásárlói azonosítókra
  const {sellerId, userId} = req.body
  try {
 //ha létezik sellerId (nem üres), akkor adja vissza az értékét
    if (sellerId !== '') {
 //sellerModel sémában megkeressük a 'sellerId-t' és
 //tároljuk a 'seller' változóban
     const seller = await sellerModel.findById(sellerId)
  //Vásárlói azonosító
     const user = await customerModel.findById(userId)
//kapcsolat létrehozása 'seller' és 'user' között
//myId a sellerCustomerModel-ből egyezzen meg a userId-val
 const checkSeller = await sellerCustomerModel.findOne({
    $and: [
      {
        myId: {
          $eq: userId
        }
      },{
//ellenőrizzük, hogy a myFriends tömbben szerepel -e az Eladó azonosítója?
        myFriends: {
          $elemMatch: {
            fdId: sellerId
         }
        }
      }
     ]
    })
//ha nincs 'checkSeller' --> azaz nincs a myFriends tömbben 'sellerId' (Eladó)
    if (!checkSeller) {
     await sellerCustomerModel.updateOne({
    //myId = userId-val akkor
        myId: userId
     },
     {
    //adja hozzá a myFriends[] tömbhöz az Eladó alábbi adatait:
      $push: {
         myFriends: {
          fdId: sellerId,
          name: seller.shopInfo?.shopName,
          image: seller.image
        }
      }
     }
    )
    }
const checkCustomer = await sellerCustomerModel.findOne({
    $and: [
    {
      myId: {
        $eq: sellerId
      }
    },{
 //ellenőrizzük, hogy a myFriends tömbben szerepel -e a Vásárló azonosítója?
          myFriends: {
            $elemMatch: {
             fdId: userId
           }
          }
         }
        ]
      })
    //ha nincs 'checkCustomer' --> azaz nincs a myFriends tömbben 'userId' (Vásárló)
     if (!checkCustomer) {
      await sellerCustomerModel.updateOne({
    //myId = userId-val akkor
        myId: sellerId
    },
    {
    //adja hozzá a myFriends[] tömbhöz a Vásárló alábbi adatait:
        $push: {
          myFriends: {
          fdId: userId,
          name: user.name,
          image: ""
        }
        }
      }
     )
    }
//üzenetek tárolása a sellerCustomerMessage gyűjteményben
//Összehasonlítjuk mindkét irányban,
//hogy az üzenet küldője vagy fogadója megegyezik -e
//az Eladó vagy Vásárló azonosítójával
 const messages = await sellerCustomerMessage.find({
  $or: [
    {
      $and: [{
        receiverId: {$eq: sellerId}
        },{
          senderId: {
            $eq: userId
          }
        }]
    },
    {
      $and: [{
        receiverId: {$eq: userId}
        },{
          senderId: {
            $eq: sellerId
          }
        }]
    }
  ]
 })
 //MyFriends - az összes csevegésben részt vett felhasználók
 const MyFriends = await sellerCustomerModel.findOne({
  myId: userId
 })
 //currentFd - a jelenlegi csevegésben részt vevő felhasználó
 //s(source)
 const currentFd = MyFriends.myFriends.find(s => s.fdId === sellerId)
 responseReturn(res,200, {
  MyFriends: MyFriends.myFriends,
  currentFd,
  messages
 })
   } else {
    const MyFriends = await sellerCustomerModel.findOne({
      myId: userId
     })
     responseReturn(res,200, {
      MyFriends: MyFriends.myFriends
     })
   }
  } catch (error) {
    console.log(error)
  }
 }
//felhasználó-eladó hozzáadása a chat-hez metódus vége

//Üzenetek küldése metódus
customer_message_add = async (req, res) => {
  const {userId,text,sellerId,name } = req.body
  //adatok eltárolása a 'sellerCustomerMessage' táblában
  try {
    const message = await sellerCustomerMessage.create({
      senderId: userId,
      senderName: name,
      receiverId: sellerId,
      message: text
    })
//konfiguráció beállítása, hogy több beszélgetésnél
//a legutóbbi kerüljön mindig a chat-lista elejére
//vásárló-eladó rész
 const data = await sellerCustomerModel.findOne({ myId: userId })
 let myFriends = data.myFriends
 //index, ami megadja az Eladó azonosítót a myFriends[]-ből
 let index = myFriends.findIndex(f => f.fdId === sellerId)
 //feltétel megadása
 while (index > 0) {
  //temp = a myFriends tömbbel, ami tartalmaz két objektumot (2 eladót)
  let temp = myFriends[index]
  myFriends[index] = myFriends[index - 1]
  myFriends[index - 1] = temp
  //a 0.index helyére increment-áljuk a legutóbbi beszélgetést,
  //azaz felülre fog kerülni
  index--
 }
 //végül frissítjük a beszélgetésekhez tartozó azonosítókat
 await sellerCustomerModel.updateOne({
  myId: userId
 },{
  myFriends
 }
)
//eladó-vásárlói rész
const data1 = await sellerCustomerModel.findOne({ myId: sellerId })
let myFriends1 = data1.myFriends
let index1 = myFriends1.findIndex(f => f.fdId === userId)
while (index1 > 0) {
 let temp1 = myFriends1[index1]
 myFriends1[index1] = myFriends[index1 - 1]
 myFriends1[index1 - 1] = temp1
 index1--
}
await sellerCustomerModel.updateOne({
 myId: sellerId
},{
 myFriends1
}
)
responseReturn(res, 201, {message})
  } catch (error) {
    console.log(error)
  }
}
//Üzenetek küldése metódus vége

//Vásárlói adatok chat-hez (Eladói felület) metódus
get_customers = async (req,res) => {
  const {sellerId} = req.params
  try {
    const data = await sellerCustomerModel.findOne({ myId: sellerId })
    responseReturn(res,200, {
      customers: data.myFriends
    })
  } catch (error) {
    console.log(error)
  }
}
//Vásárlói adatok chat-hez (Eladói felület) metódus vége

//Vásárlói üzenetek megjelenítése metódus
get_customers_seller_message = async(req,res) => {
  const { customerId } = req.params
//unique id, amit authMiddleware-rel adunk át
  const {id} = req

  try {
    const messages = await sellerCustomerMessage.find({
      $or: [
        {
          $and: [{
            receiverId: {$eq: customerId}
            },{
              senderId: {
                $eq: id
              }
            }]
        },
        {
          $and: [{
            receiverId: {$eq: id}
            },{
              senderId: {
                $eq: customerId
              }
            }]
        }
      ]
     })
    const currentCustomer = await customerModel.findById(customerId)
    responseReturn(res,200,{
      messages,
      currentCustomer
    })
  } catch (error) {
    console.log(error)
  }
}
//Vásárlói üzenetek megjelenítése metódus vége

//Eladói üzenetek metódus
seller_message_add = async(req,res) => {
  const {senderId,receiverId,text,name} = req.body

  try {
    const message = await sellerCustomerMessage.create({
      senderId: senderId,
      senderName: name,
      receiverId: receiverId,
      message: text
    })

 const data = await sellerCustomerModel.findOne({ myId: senderId })
 let myFriends = data.myFriends
 let index = myFriends.findIndex(f => f.fdId === receiverId)
 
 while (index > 0) {
  let temp = myFriends[index]
  myFriends[index] = myFriends[index - 1]
  myFriends[index - 1] = temp
  index--
 }
 
 await sellerCustomerModel.updateOne({
  myId: senderId
 },{
  myFriends
 }
)

const data1 = await sellerCustomerModel.findOne({ myId: receiverId })
let myFriends1 = data1.myFriends
let index1 = myFriends1.findIndex(f => f.fdId === senderId)
while (index1 > 0) {
 let temp1 = myFriends1[index1]
 myFriends1[index1] = myFriends[index1 - 1]
 myFriends1[index1 - 1] = temp1
 index1--
}
await sellerCustomerModel.updateOne({
 myId: receiverId
},{
 myFriends1
}
)
responseReturn(res, 201, {message})
  } catch (error) {
    console.log(error)
  }
}
//Eladói üzenetek metódus vége

//Eladói adatok chat-hez (Admin felület) metódus
get_sellers = async (req, res) => { 
  try {
      const sellers = await sellerModel.find({})
      responseReturn(res, 200, {
          sellers
      })
  } catch (error) {
      console.log(error)
  }
}
//Eladói adatok chat-hez (Admin felület) metódus vége
//Admin-Eladó üzenetek metódus
seller_admin_message_insert = async (req, res) => { 
  const {senderId,receiverId,message,senderName} = req.body
//gyűjtemény létrehozása az üzenetek tárolására
  try {
    const messageData = await adminSellerMessage.create({
      senderId,
      receiverId,
      message,
      senderName
    })
    responseReturn(res, 200, {message: messageData})
  } catch (error) {
    console.log(error)
  }
}
//Admin-Eladó üzenetek metódus vége
//Admin üzenetek megjelenítése metódus
get_admin_messages = async (req, res) => {
  const { receiverId } = req.params
//unique id, amit authMiddleware-rel adunk át
  const id = ""

  try {
  const messages = await adminSellerMessage.find({
    $or: [
      {
      $and: [{
       receiverId: {$eq: receiverId}
       },{
        senderId: {
          $eq: id
        }
       }]
      },
      {
      $and: [{
      receiverId: {$eq: id}
      },{
        senderId: {
          $eq: receiverId
        }
       }]
    }
    ]
    })

  let currentSeller = {}
    if (receiverId) {
      currentSeller = await sellerModel.findById(receiverId)
    }
  responseReturn(res,200,{
    messages,
    currentSeller
  })
  } catch (error) {
    console.log(error)
  }
}
//Admin üzenetek megjelenítése metódus vége
//Eladói üzenetek megjelenítése metódus
get_seller_messages = async (req, res) => {
  const receiverId = ""
//unique id, amit authMiddleware-rel adunk át
  const {id} = req

  try {
  const messages = await adminSellerMessage.find({
    $or: [
      {
      $and: [{
       receiverId: {$eq: receiverId}
       },{
        senderId: {
          $eq: id
        }
       }]
      },
      {
      $and: [{
      receiverId: {$eq: id}
      },{
        senderId: {
          $eq: receiverId
        }
       }]
    }
    ]
    })

  responseReturn(res,200,{
    messages,
  })
  } catch (error) {
    console.log(error)
  }
}
//Eladói üzenetek megjelenítése metódus vége
}

module.exports = new chatController()