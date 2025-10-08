const express = require('express');
const { body, validationResult, param, query } = require('express-validator');
const { ObjectId } = require('mongodb');
const router = express.Router();

// Validation middleware
const validateEmployee = [
  body('first_name').notEmpty().withMessage('First name is required'),
  body('last_name').notEmpty().withMessage('Last name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('position').notEmpty().withMessage('Position is required'),
  body('salary').isNumeric().withMessage('Salary must be a number'),
  body('date_of_joining').isISO8601().withMessage('Valid date is required'),
  body('department').notEmpty().withMessage('Department is required')
];

const validateEmployeeUpdate = [
  body('first_name').optional().notEmpty().withMessage('First name cannot be empty'),
  body('last_name').optional().notEmpty().withMessage('Last name cannot be empty'),
  body('email').optional().isEmail().withMessage('Valid email is required'),
  body('position').optional().notEmpty().withMessage('Position cannot be empty'),
  body('salary').optional().isNumeric().withMessage('Salary must be a number'),
  body('date_of_joining').optional().isISO8601().withMessage('Valid date is required'),
  body('department').optional().notEmpty().withMessage('Department cannot be empty')
];

const validateObjectId = [
  param('eid').isMongoId().withMessage('Invalid employee ID')
];

const validateQueryId = [
  query('eid').isMongoId().withMessage('Invalid employee ID')
];

// GET /api/v1/emp/employees
router.get('/employees', async (req, res) => {
  try {
    const employeesCollection = req.db.collection('employees');
    const employees = await employeesCollection.find({}).toArray();

    const formattedEmployees = employees.map(emp => ({
      employee_id: emp._id.toString(),
      first_name: emp.first_name,
      last_name: emp.last_name,
      email: emp.email,
      position: emp.position,
      salary: emp.salary,
      date_of_joining: emp.date_of_joining,
      department: emp.department
    }));

    res.status(200).json(formattedEmployees);

  } catch (error) {
    console.error('Get employees error:', error);
    res.status(500).json({
      status: false,
      message: 'Internal server error'
    });
  }
});

// POST /api/v1/emp/employees
router.post('/employees', validateEmployee, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: false,
        message: errors.array()[0].msg
      });
    }

    const { first_name, last_name, email, position, salary, date_of_joining, department } = req.body;
    const employeesCollection = req.db.collection('employees');

    // Check if employee already exists
    const existingEmployee = await employeesCollection.findOne({ email });
    if (existingEmployee) {
      return res.status(400).json({
        status: false,
        message: 'Employee already exists with this email'
      });
    }

    const newEmployee = {
      first_name,
      last_name,
      email,
      position,
      salary: Number(salary),
      date_of_joining: new Date(date_of_joining),
      department,
      created_at: new Date(),
      updated_at: new Date()
    };

    const result = await employeesCollection.insertOne(newEmployee);

    res.status(201).json({
      message: 'Employee created successfully.',
      employee_id: result.insertedId.toString()
    });

  } catch (error) {
    console.error('Create employee error:', error);
    res.status(500).json({
      status: false,
      message: 'Internal server error'
    });
  }
});

// GET /api/v1/emp/employees/{eid}
router.get('/employees/:eid', validateObjectId, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: false,
        message: errors.array()[0].msg
      });
    }

    const { eid } = req.params;
    const employeesCollection = req.db.collection('employees');

    const employee = await employeesCollection.findOne({ _id: new ObjectId(eid) });

    if (!employee) {
      return res.status(404).json({
        status: false,
        message: 'Employee not found'
      });
    }

    const formattedEmployee = {
      employee_id: employee._id.toString(),
      first_name: employee.first_name,
      last_name: employee.last_name,
      email: employee.email,
      position: employee.position,
      salary: employee.salary,
      date_of_joining: employee.date_of_joining,
      department: employee.department
    };

    res.status(200).json(formattedEmployee);

  } catch (error) {
    console.error('Get employee error:', error);
    res.status(500).json({
      status: false,
      message: 'Internal server error'
    });
  }
});

// PUT /api/v1/emp/employees/{eid}
router.put('/employees/:eid', validateObjectId, validateEmployeeUpdate, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: false,
        message: errors.array()[0].msg
      });
    }

    const { eid } = req.params;
    const employeesCollection = req.db.collection('employees');

    // Check if employee exists
    const existingEmployee = await employeesCollection.findOne({ _id: new ObjectId(eid) });
    if (!existingEmployee) {
      return res.status(404).json({
        status: false,
        message: 'Employee not found'
      });
    }

    // Prepare update data
    const updateData = { ...req.body, updated_at: new Date() };
    
    // Convert salary to number if provided
    if (updateData.salary) {
      updateData.salary = Number(updateData.salary);
    }
    
    // Convert date if provided
    if (updateData.date_of_joining) {
      updateData.date_of_joining = new Date(updateData.date_of_joining);
    }

    await employeesCollection.updateOne(
      { _id: new ObjectId(eid) },
      { $set: updateData }
    );

    res.status(200).json({
      message: 'Employee details updated successfully.'
    });

  } catch (error) {
    console.error('Update employee error:', error);
    res.status(500).json({
      status: false,
      message: 'Internal server error'
    });
  }
});

// DELETE /api/v1/emp/employees?eid=xxx
router.delete('/employees', validateQueryId, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: false,
        message: errors.array()[0].msg
      });
    }

    const { eid } = req.query;
    const employeesCollection = req.db.collection('employees');

    // Check if employee exists
    const existingEmployee = await employeesCollection.findOne({ _id: new ObjectId(eid) });
    if (!existingEmployee) {
      return res.status(404).json({
        status: false,
        message: 'Employee not found'
      });
    }

    await employeesCollection.deleteOne({ _id: new ObjectId(eid) });

    res.status(200).json({
      message: "Employee deleted successfully."
    });

  } catch (error) {
    console.error('Delete employee error:', error);
    res.status(500).json({
      status: false,
      message: 'Internal server error'
    });
  }
});

module.exports = router;
