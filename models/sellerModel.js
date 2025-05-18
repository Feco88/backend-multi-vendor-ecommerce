const { Schema, model } = require('mongoose')
const sellerSchema = new Schema({
    name: {
        type: String,
        required : true
    },
    email: {
        type: String,
        required : true
    },
    password: {
        type: String,
        required : true,
        select: false 
    },
    role: {
        type: String,
        default : 'seller' //seller
    },
    status: {
        type: String,
        default : 'pending' //pending
    },
    payment: {
        type: String,
        default : 'inactive' //inactive
    },
    method: {
        type: String,
        required : true
    },
    image: {
        type: String,
        default: ''
    },
    shopInfo: {
        type: Object,
        default: {}
    },
},{timestamps: true })
//keresőhöz indexeljük a sémát
sellerSchema.index({
    name: 'text',
    email: 'text',
},{
//beállítjuk prioritás szerint a keresőt
    weights: {
        name: 5,
        email: 4,
    }
})

module.exports = model('sellers',sellerSchema)

