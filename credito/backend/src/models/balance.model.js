const mongoose = require("mongoose");

const BalanceSchema = new mongoose.Schema({
    nombre: String,
    monto: Number,
    fecha: Date
});

module.exports = mongoose.model("Balance", BalanceSchema);
