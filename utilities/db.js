const mongoose = require('mongoose')

module.exports.dbConnect = async()=>{
    try {
        if (process.env.MODE === 'pro') {
            await mongoose.connect(process.env.DB_PRO_URL, {useNewURLParser: true})
            console.log('Webalkalmazás adatbázis csatlakoztatva...')
        } else {
            await mongoose.connect(process.env.DB_LOCAL_URL, {useNewURLParser: true})
            console.log('Helyi adatbázis csatlakoztatva...')
        }
    } catch (error) {
        console.log(error.message)
    }
}
