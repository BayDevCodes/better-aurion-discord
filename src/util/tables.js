// Third-party module
const { QuickDB } = require('quick.db'); // Class used to interact with a sqlite database

const db = new QuickDB({ filePath: './src/db.sqlite' }); // Open the local database

// Export all the tables to be used in other files
module.exports = {
    /**
     *  *Marks published by the referee*  
     *   
     *  **Mark row structure:**  
     *  markId: `string` *The full name of the mark.*  
     *  (e.g. "Unit > Module: Type n°number")
     */
    Marks: db.table('marks'),

    /**
     *  *Registered students*
     *   
     *  **Student row structure:**  
     *  userId: `object`  
     *  * *Wether the student wants to their name on leaderboards or not.*  
     *  anonymous: `boolean`  
     *  * *The student's averages object.*  
     *  averages: `object`  
     *  * * *The general average.*  
     *  general: `number`  
     *  * * *The averages object of a unit.*  
     *  unitId: `object`  
     *  * * * *The unit's average.*  
     *  self: `number`  
     *  * * * *The averages object of a module.*  
     *  moduleId: `object`  
     *  * * * * *The module's average.*  
     *  self: `number`  
     *  * * * * *The average of a type.*  
     *  typeId: `number`
     *  * *Mail adress of the student.*  
     *  email: `string`  
     *  * *The array of mark objects registered by the student.*  
     *  marks: `object[]`  
     *  * * *The mark's id* ("unitId_moduleId_type_number").  
     *  id: `string`  
     *  * * *The mark's value between 0 & 20 or -1 for absence.*  
     *  value: `number`  
     *  * *The student's goals object.*  
     *  goals: `object`  
     *  * * *The goal value between 10 & 20 for a unit.*  
     *  unitId: `number`
     */
    Promotion: db.table('promotion'),

    /**
     * *Core data and additional bot statistics*  
     *   
     * **Main rows:**  
     * interactionCount: `number` *The total number of interactions with the bot.*  
     * promotionAverages: `object` *The promotion averages object (same as students').*  
     * promotionAveragesUpdate: `number` *When promotion averages will be updated.*  
     * referees: `string[]` *The referees' Discord user ids.*
     */
    Main: db
};
