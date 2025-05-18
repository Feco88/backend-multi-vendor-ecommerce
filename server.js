const express = require('express')
const app = express()

const cors = require('cors')
const bodyParser = require('body-parser')
const cookieParser = require('cookie-parser')
const { dbConnect } = require('./utilities/db')

const socket = require('socket.io')
const http = require('http')
const server = http.createServer(app)
app.use(cors({
    origin : process.env.mode === 'pro' ? [process.env.client_customer_production_url,
    process.env.client_admin_production_url] :
    ['http://localhost:3000', 'http://localhost:3001'],
    credentials : true
}))
//socket szerver beállítás
const io = socket(server, {
    cors: {
    origin : process.env.mode === 'pro' ? [process.env.client_customer_production_url,
    process.env.client_admin_production_url] :
    ['http://localhost:3000', 'http://localhost:3001'],
    //origin: '*', //összes routes
    credentials: true
    }
})

var allCustomer = []
var allSeller = []
var admin = { }

const addUser = (customerId,socketId,userInfo) => {
 const checkUser = allCustomer.some(u => u.customerId === customerId)
 //ha a felhasználó nem létezik, akkor töltse fel az allCustomer[]-t
 if (!checkUser) {
    allCustomer.push({
        customerId,
        socketId,
        userInfo
    })
 }
}
const addSeller =  (sellerId,socketId,userInfo) => {
    const checkSeller = allSeller.some(u => u.sellerId === sellerId)
    if (!checkSeller) {
       allSeller.push({
           sellerId,
           socketId,
           userInfo
       })
    }
   }
//valósidejű kommunikácós metódus
const findCustomer = (customerId) => {
    return allCustomer.find(c => c.customerId === customerId)
}
//findSeller metódus
const findSeller = (sellerId) => {
    return allSeller.find(c => c.sellerId === sellerId)
}
//láthatósági metódus
const remove = (socketId) => {
    allCustomer = allCustomer.filter(c => c.socketId !== socketId)
    allSeller = allSeller.filter(c => c.socketId !== socketId)
}

//socket futtatása, ami a Frontend felől érkezik
io.on('connection',(soc)=>{
    console.log('Fut a socket-szerver!')
//customerId = userId -> ez a kettő ugyanaz
    soc.on('add_user',(customerId,userInfo) => {
        addUser(customerId,soc.id,userInfo)
        io.emit('activeSeller', allSeller)
    })
//add_seller metódus hozzáadása dashboard felől
    soc.on('add_seller',(sellerId,userInfo)=>{
        addSeller(sellerId,soc.id,userInfo)
        io.emit('activeSeller', allSeller)
    })
//valósidejű metódus dashboard - SellerToCustomer.jsx - Eladó
    soc.on('send_seller_message',(msg) => {
        const customer = findCustomer(msg.receiverId)
        if (customer !== undefined) {
            soc.to(customer.socketId).emit('seller_message',msg)
        }
    })
//valósidejű metódus frontend - Chat.jsx - Vásárló
    soc.on('send_customer_message',(msg) => {
        const seller = findSeller(msg.receiverId)
        if (seller !== undefined) {
            soc.to(seller.socketId).emit('customer_message',msg)
        }
    })
//valósidejű metódus frontend - ChatSeller.jsx - Admin
soc.on('send_message_admin_to_seller',(msg) => {
    const seller = findSeller(msg.receiverId)
    if (seller !== undefined) {
        soc.to(seller.socketId).emit('received_admin_message',msg)
    }
})
//valósidejű metódus frontend - SellerToAdmin.jsx - Eladó
soc.on('send_message_seller_to_admin',(msg) => {
    if (admin.socketId) {
        soc.to(admin.socketId).emit('received_seller_message',msg)
    }
})
//add_admin metódus hozzáadása    
    soc.on('add_admin',(adminInfo)=>{
      delete adminInfo.email //nem szeretnénk megosztani az admin email címét
      delete adminInfo.password //nem szeretnénk megosztani az admin jelszavát
      admin = adminInfo
      admin.socketId = soc.id
      io.emit('activeSeller', allSeller)
    })
//láthatóság beállítása
    soc.on('disconnect',() => {
        console.log('felhasználó nem elérhető')
        remove(soc.id)
        io.emit('activeSeller', allSeller)
    })
})

require('dotenv').config()

app.use(bodyParser.json())
app.use(cookieParser())

app.use('/api/home',require('./routes/home/homeRoutes'))
app.use('/api',require('./routes/authRoutes'))
app.use('/api',require('./routes/home/cartRoutes'))
app.use('/api',require('./routes/order/orderRoutes'))
app.use('/api',require('./routes/dashboard/categoryRoutes'))
app.use('/api',require('./routes/dashboard/productRoutes'))
app.use('/api',require('./routes/dashboard/sellerRoutes'))
app.use('/api',require('./routes/home/customerAuthRoutes'))
app.use('/api',require('./routes/chatRoutes'))
app.use('/api',require('./routes/paymentRoutes'))
app.use('/api',require('./routes/dashboard/dashboardRoutes'))

app.get('/',(req,res) => res.send('Ez itt a backend szerver!'))

const port = process.env.PORT
dbConnect()
server.listen(port, () => console.log(`A szerver az alábbi porton fut: ${port}`))
