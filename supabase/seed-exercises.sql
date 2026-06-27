-- Exercise library seed
-- Coach ID: bbaf9428-fa9c-475a-a940-80ec7a77f924

INSERT INTO exercises (coach_id, name, muscle_groups) VALUES

-- CHEST
('bbaf9428-fa9c-475a-a940-80ec7a77f924', 'Barbell Bench Press', ARRAY['chest']::muscle_group[]),
('bbaf9428-fa9c-475a-a940-80ec7a77f924', 'Incline Barbell Bench Press', ARRAY['chest', 'shoulders']::muscle_group[]),
('bbaf9428-fa9c-475a-a940-80ec7a77f924', 'Decline Barbell Bench Press', ARRAY['chest']::muscle_group[]),
('bbaf9428-fa9c-475a-a940-80ec7a77f924', 'Dumbbell Bench Press', ARRAY['chest']::muscle_group[]),
('bbaf9428-fa9c-475a-a940-80ec7a77f924', 'Incline Dumbbell Press', ARRAY['chest', 'shoulders']::muscle_group[]),
('bbaf9428-fa9c-475a-a940-80ec7a77f924', 'Decline Dumbbell Press', ARRAY['chest']::muscle_group[]),
('bbaf9428-fa9c-475a-a940-80ec7a77f924', 'Dumbbell Flyes', ARRAY['chest']::muscle_group[]),
('bbaf9428-fa9c-475a-a940-80ec7a77f924', 'Incline Dumbbell Flyes', ARRAY['chest']::muscle_group[]),
('bbaf9428-fa9c-475a-a940-80ec7a77f924', 'Cable Crossover', ARRAY['chest']::muscle_group[]),
('bbaf9428-fa9c-475a-a940-80ec7a77f924', 'Cable Flyes', ARRAY['chest']::muscle_group[]),
('bbaf9428-fa9c-475a-a940-80ec7a77f924', 'Push-up', ARRAY['chest', 'triceps']::muscle_group[]),
('bbaf9428-fa9c-475a-a940-80ec7a77f924', 'Chest Dips', ARRAY['chest', 'triceps']::muscle_group[]),
('bbaf9428-fa9c-475a-a940-80ec7a77f924', 'Pec Deck', ARRAY['chest']::muscle_group[]),
('bbaf9428-fa9c-475a-a940-80ec7a77f924', 'Landmine Press', ARRAY['chest', 'shoulders']::muscle_group[]),

-- BACK
('bbaf9428-fa9c-475a-a940-80ec7a77f924', 'Conventional Deadlift', ARRAY['back', 'hamstrings', 'glutes']::muscle_group[]),
('bbaf9428-fa9c-475a-a940-80ec7a77f924', 'Barbell Row', ARRAY['back']::muscle_group[]),
('bbaf9428-fa9c-475a-a940-80ec7a77f924', 'Pendlay Row', ARRAY['back']::muscle_group[]),
('bbaf9428-fa9c-475a-a940-80ec7a77f924', 'Dumbbell Row', ARRAY['back']::muscle_group[]),
('bbaf9428-fa9c-475a-a940-80ec7a77f924', 'Seated Cable Row', ARRAY['back']::muscle_group[]),
('bbaf9428-fa9c-475a-a940-80ec7a77f924', 'Lat Pulldown', ARRAY['back', 'biceps']::muscle_group[]),
('bbaf9428-fa9c-475a-a940-80ec7a77f924', 'Pull-up', ARRAY['back', 'biceps']::muscle_group[]),
('bbaf9428-fa9c-475a-a940-80ec7a77f924', 'Chin-up', ARRAY['back', 'biceps']::muscle_group[]),
('bbaf9428-fa9c-475a-a940-80ec7a77f924', 'T-Bar Row', ARRAY['back']::muscle_group[]),
('bbaf9428-fa9c-475a-a940-80ec7a77f924', 'Face Pull', ARRAY['back', 'shoulders']::muscle_group[]),
('bbaf9428-fa9c-475a-a940-80ec7a77f924', 'Rack Pull', ARRAY['back']::muscle_group[]),
('bbaf9428-fa9c-475a-a940-80ec7a77f924', 'Straight Arm Pulldown', ARRAY['back']::muscle_group[]),
('bbaf9428-fa9c-475a-a940-80ec7a77f924', 'Single Arm Cable Row', ARRAY['back']::muscle_group[]),
('bbaf9428-fa9c-475a-a940-80ec7a77f924', 'Meadows Row', ARRAY['back']::muscle_group[]),

-- SHOULDERS
('bbaf9428-fa9c-475a-a940-80ec7a77f924', 'Barbell Overhead Press', ARRAY['shoulders']::muscle_group[]),
('bbaf9428-fa9c-475a-a940-80ec7a77f924', 'Dumbbell Shoulder Press', ARRAY['shoulders']::muscle_group[]),
('bbaf9428-fa9c-475a-a940-80ec7a77f924', 'Arnold Press', ARRAY['shoulders']::muscle_group[]),
('bbaf9428-fa9c-475a-a940-80ec7a77f924', 'Lateral Raise', ARRAY['shoulders']::muscle_group[]),
('bbaf9428-fa9c-475a-a940-80ec7a77f924', 'Cable Lateral Raise', ARRAY['shoulders']::muscle_group[]),
('bbaf9428-fa9c-475a-a940-80ec7a77f924', 'Front Raise', ARRAY['shoulders']::muscle_group[]),
('bbaf9428-fa9c-475a-a940-80ec7a77f924', 'Rear Delt Flye', ARRAY['shoulders', 'back']::muscle_group[]),
('bbaf9428-fa9c-475a-a940-80ec7a77f924', 'Cable Rear Delt Flye', ARRAY['shoulders', 'back']::muscle_group[]),
('bbaf9428-fa9c-475a-a940-80ec7a77f924', 'Upright Row', ARRAY['shoulders', 'biceps']::muscle_group[]),
('bbaf9428-fa9c-475a-a940-80ec7a77f924', 'Machine Shoulder Press', ARRAY['shoulders']::muscle_group[]),
('bbaf9428-fa9c-475a-a940-80ec7a77f924', 'Band Pull Apart', ARRAY['shoulders', 'back']::muscle_group[]),

-- BICEPS
('bbaf9428-fa9c-475a-a940-80ec7a77f924', 'Barbell Curl', ARRAY['biceps']::muscle_group[]),
('bbaf9428-fa9c-475a-a940-80ec7a77f924', 'Dumbbell Curl', ARRAY['biceps']::muscle_group[]),
('bbaf9428-fa9c-475a-a940-80ec7a77f924', 'Hammer Curl', ARRAY['biceps', 'forearms']::muscle_group[]),
('bbaf9428-fa9c-475a-a940-80ec7a77f924', 'Incline Dumbbell Curl', ARRAY['biceps']::muscle_group[]),
('bbaf9428-fa9c-475a-a940-80ec7a77f924', 'Preacher Curl', ARRAY['biceps']::muscle_group[]),
('bbaf9428-fa9c-475a-a940-80ec7a77f924', 'Cable Curl', ARRAY['biceps']::muscle_group[]),
('bbaf9428-fa9c-475a-a940-80ec7a77f924', 'Concentration Curl', ARRAY['biceps']::muscle_group[]),
('bbaf9428-fa9c-475a-a940-80ec7a77f924', 'Spider Curl', ARRAY['biceps']::muscle_group[]),
('bbaf9428-fa9c-475a-a940-80ec7a77f924', 'Reverse Curl', ARRAY['biceps', 'forearms']::muscle_group[]),
('bbaf9428-fa9c-475a-a940-80ec7a77f924', 'Zottman Curl', ARRAY['biceps', 'forearms']::muscle_group[]),

-- TRICEPS
('bbaf9428-fa9c-475a-a940-80ec7a77f924', 'Tricep Pushdown', ARRAY['triceps']::muscle_group[]),
('bbaf9428-fa9c-475a-a940-80ec7a77f924', 'Skull Crusher', ARRAY['triceps']::muscle_group[]),
('bbaf9428-fa9c-475a-a940-80ec7a77f924', 'Close-Grip Bench Press', ARRAY['triceps', 'chest']::muscle_group[]),
('bbaf9428-fa9c-475a-a940-80ec7a77f924', 'Overhead Tricep Extension', ARRAY['triceps']::muscle_group[]),
('bbaf9428-fa9c-475a-a940-80ec7a77f924', 'Cable Overhead Tricep Extension', ARRAY['triceps']::muscle_group[]),
('bbaf9428-fa9c-475a-a940-80ec7a77f924', 'Tricep Kickback', ARRAY['triceps']::muscle_group[]),
('bbaf9428-fa9c-475a-a940-80ec7a77f924', 'Tricep Dips', ARRAY['triceps', 'chest']::muscle_group[]),
('bbaf9428-fa9c-475a-a940-80ec7a77f924', 'Diamond Push-up', ARRAY['triceps']::muscle_group[]),

-- CORE
('bbaf9428-fa9c-475a-a940-80ec7a77f924', 'Plank', ARRAY['core']::muscle_group[]),
('bbaf9428-fa9c-475a-a940-80ec7a77f924', 'Side Plank', ARRAY['core']::muscle_group[]),
('bbaf9428-fa9c-475a-a940-80ec7a77f924', 'Crunch', ARRAY['core']::muscle_group[]),
('bbaf9428-fa9c-475a-a940-80ec7a77f924', 'Sit-up', ARRAY['core']::muscle_group[]),
('bbaf9428-fa9c-475a-a940-80ec7a77f924', 'Leg Raise', ARRAY['core']::muscle_group[]),
('bbaf9428-fa9c-475a-a940-80ec7a77f924', 'Hanging Leg Raise', ARRAY['core']::muscle_group[]),
('bbaf9428-fa9c-475a-a940-80ec7a77f924', 'Hanging Knee Raise', ARRAY['core']::muscle_group[]),
('bbaf9428-fa9c-475a-a940-80ec7a77f924', 'Cable Crunch', ARRAY['core']::muscle_group[]),
('bbaf9428-fa9c-475a-a940-80ec7a77f924', 'Ab Rollout', ARRAY['core']::muscle_group[]),
('bbaf9428-fa9c-475a-a940-80ec7a77f924', 'Russian Twist', ARRAY['core']::muscle_group[]),
('bbaf9428-fa9c-475a-a940-80ec7a77f924', 'Bicycle Crunch', ARRAY['core']::muscle_group[]),
('bbaf9428-fa9c-475a-a940-80ec7a77f924', 'Dead Bug', ARRAY['core']::muscle_group[]),
('bbaf9428-fa9c-475a-a940-80ec7a77f924', 'Pallof Press', ARRAY['core']::muscle_group[]),

-- QUADS
('bbaf9428-fa9c-475a-a940-80ec7a77f924', 'Back Squat', ARRAY['quads', 'glutes']::muscle_group[]),
('bbaf9428-fa9c-475a-a940-80ec7a77f924', 'Front Squat', ARRAY['quads']::muscle_group[]),
('bbaf9428-fa9c-475a-a940-80ec7a77f924', 'Leg Press', ARRAY['quads', 'glutes']::muscle_group[]),
('bbaf9428-fa9c-475a-a940-80ec7a77f924', 'Hack Squat', ARRAY['quads']::muscle_group[]),
('bbaf9428-fa9c-475a-a940-80ec7a77f924', 'Leg Extension', ARRAY['quads']::muscle_group[]),
('bbaf9428-fa9c-475a-a940-80ec7a77f924', 'Bulgarian Split Squat', ARRAY['quads', 'glutes']::muscle_group[]),
('bbaf9428-fa9c-475a-a940-80ec7a77f924', 'Walking Lunge', ARRAY['quads', 'glutes']::muscle_group[]),
('bbaf9428-fa9c-475a-a940-80ec7a77f924', 'Reverse Lunge', ARRAY['quads', 'glutes']::muscle_group[]),
('bbaf9428-fa9c-475a-a940-80ec7a77f924', 'Step-up', ARRAY['quads', 'glutes']::muscle_group[]),
('bbaf9428-fa9c-475a-a940-80ec7a77f924', 'Goblet Squat', ARRAY['quads']::muscle_group[]),
('bbaf9428-fa9c-475a-a940-80ec7a77f924', 'Sissy Squat', ARRAY['quads']::muscle_group[]),
('bbaf9428-fa9c-475a-a940-80ec7a77f924', 'Sumo Squat', ARRAY['quads', 'glutes']::muscle_group[]),

-- HAMSTRINGS
('bbaf9428-fa9c-475a-a940-80ec7a77f924', 'Romanian Deadlift', ARRAY['hamstrings', 'glutes']::muscle_group[]),
('bbaf9428-fa9c-475a-a940-80ec7a77f924', 'Lying Leg Curl', ARRAY['hamstrings']::muscle_group[]),
('bbaf9428-fa9c-475a-a940-80ec7a77f924', 'Seated Leg Curl', ARRAY['hamstrings']::muscle_group[]),
('bbaf9428-fa9c-475a-a940-80ec7a77f924', 'Nordic Curl', ARRAY['hamstrings']::muscle_group[]),
('bbaf9428-fa9c-475a-a940-80ec7a77f924', 'Good Morning', ARRAY['hamstrings', 'back']::muscle_group[]),
('bbaf9428-fa9c-475a-a940-80ec7a77f924', 'Stiff-Leg Deadlift', ARRAY['hamstrings', 'back']::muscle_group[]),
('bbaf9428-fa9c-475a-a940-80ec7a77f924', 'Glute-Ham Raise', ARRAY['hamstrings', 'glutes']::muscle_group[]),

-- GLUTES
('bbaf9428-fa9c-475a-a940-80ec7a77f924', 'Hip Thrust', ARRAY['glutes']::muscle_group[]),
('bbaf9428-fa9c-475a-a940-80ec7a77f924', 'Glute Bridge', ARRAY['glutes']::muscle_group[]),
('bbaf9428-fa9c-475a-a940-80ec7a77f924', 'Single Leg Hip Thrust', ARRAY['glutes']::muscle_group[]),
('bbaf9428-fa9c-475a-a940-80ec7a77f924', 'Cable Kickback', ARRAY['glutes']::muscle_group[]),
('bbaf9428-fa9c-475a-a940-80ec7a77f924', 'Sumo Deadlift', ARRAY['glutes', 'hamstrings']::muscle_group[]),
('bbaf9428-fa9c-475a-a940-80ec7a77f924', 'Abductor Machine', ARRAY['glutes']::muscle_group[]),
('bbaf9428-fa9c-475a-a940-80ec7a77f924', 'Clamshell', ARRAY['glutes']::muscle_group[]),

-- CALVES
('bbaf9428-fa9c-475a-a940-80ec7a77f924', 'Standing Calf Raise', ARRAY['calves']::muscle_group[]),
('bbaf9428-fa9c-475a-a940-80ec7a77f924', 'Seated Calf Raise', ARRAY['calves']::muscle_group[]),
('bbaf9428-fa9c-475a-a940-80ec7a77f924', 'Leg Press Calf Raise', ARRAY['calves']::muscle_group[]),
('bbaf9428-fa9c-475a-a940-80ec7a77f924', 'Single Leg Calf Raise', ARRAY['calves']::muscle_group[]),
('bbaf9428-fa9c-475a-a940-80ec7a77f924', 'Donkey Calf Raise', ARRAY['calves']::muscle_group[]),

-- FOREARMS
('bbaf9428-fa9c-475a-a940-80ec7a77f924', 'Wrist Curl', ARRAY['forearms']::muscle_group[]),
('bbaf9428-fa9c-475a-a940-80ec7a77f924', 'Reverse Wrist Curl', ARRAY['forearms']::muscle_group[]),
('bbaf9428-fa9c-475a-a940-80ec7a77f924', 'Farmer''s Walk', ARRAY['forearms', 'full_body']::muscle_group[]),
('bbaf9428-fa9c-475a-a940-80ec7a77f924', 'Dead Hang', ARRAY['forearms', 'back']::muscle_group[]),

-- FULL BODY
('bbaf9428-fa9c-475a-a940-80ec7a77f924', 'Clean and Press', ARRAY['full_body']::muscle_group[]),
('bbaf9428-fa9c-475a-a940-80ec7a77f924', 'Kettlebell Swing', ARRAY['full_body', 'glutes']::muscle_group[]),
('bbaf9428-fa9c-475a-a940-80ec7a77f924', 'Thruster', ARRAY['full_body']::muscle_group[]),
('bbaf9428-fa9c-475a-a940-80ec7a77f924', 'Power Clean', ARRAY['full_body']::muscle_group[]),
('bbaf9428-fa9c-475a-a940-80ec7a77f924', 'Turkish Get-up', ARRAY['full_body']::muscle_group[]),
('bbaf9428-fa9c-475a-a940-80ec7a77f924', 'Sled Push', ARRAY['full_body', 'quads']::muscle_group[]),
('bbaf9428-fa9c-475a-a940-80ec7a77f924', 'Sled Pull', ARRAY['full_body', 'back']::muscle_group[]),
('bbaf9428-fa9c-475a-a940-80ec7a77f924', 'Battle Ropes', ARRAY['full_body', 'cardio']::muscle_group[]),

-- CARDIO
('bbaf9428-fa9c-475a-a940-80ec7a77f924', 'Treadmill', ARRAY['cardio']::muscle_group[]),
('bbaf9428-fa9c-475a-a940-80ec7a77f924', 'Stationary Bike', ARRAY['cardio']::muscle_group[]),
('bbaf9428-fa9c-475a-a940-80ec7a77f924', 'Rowing Machine', ARRAY['cardio']::muscle_group[]),
('bbaf9428-fa9c-475a-a940-80ec7a77f924', 'Elliptical', ARRAY['cardio']::muscle_group[]),
('bbaf9428-fa9c-475a-a940-80ec7a77f924', 'Stair Climber', ARRAY['cardio']::muscle_group[]),
('bbaf9428-fa9c-475a-a940-80ec7a77f924', 'Jump Rope', ARRAY['cardio']::muscle_group[]),
('bbaf9428-fa9c-475a-a940-80ec7a77f924', 'Assault Bike', ARRAY['cardio', 'full_body']::muscle_group[]);
```
