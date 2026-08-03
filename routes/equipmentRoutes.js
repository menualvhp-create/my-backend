const express = require('express');
const Equipment = require('../models/Equipment');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const equipment = await Equipment.find().populate('owner', 'name email phone district city role');

    return res.status(200).json({
      success: true,
      message: 'Rental equipment fetched successfully.',
      data: equipment,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch equipment.',
      data: null,
    });
  }
});

router.post('/', protect, async (req, res) => {
  try {
    const { title, category, pricePerDay, deposit, location, isAvailable } = req.body;

    if (!title || !category || !pricePerDay || !deposit || !location) {
      return res.status(400).json({
        success: false,
        message: 'Please provide title, category, pricePerDay, deposit, and location.',
        data: null,
      });
    }

    const equipment = await Equipment.create({
      title,
      category,
      pricePerDay,
      deposit,
      location,
      isAvailable: typeof isAvailable === 'boolean' ? isAvailable : true,
      owner: req.user._id,
    });

    const populatedEquipment = await equipment.populate('owner', 'name email phone district city role');

    return res.status(201).json({
      success: true,
      message: 'Equipment listing created successfully.',
      data: populatedEquipment,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to create equipment listing.',
      data: null,
    });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const equipment = await Equipment.findById(req.params.id).populate('owner', 'name email phone district city role');

    if (!equipment) {
      return res.status(404).json({
        success: false,
        message: 'Equipment not found.',
        data: null,
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Equipment details fetched successfully.',
      data: equipment,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch equipment details.',
      data: null,
    });
  }
});

module.exports = router;
