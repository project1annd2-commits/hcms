import React, { useState, useEffect } from 'react';
import { db } from '../lib/services/db';
import { Collections } from '../lib/constants';
import { Teacher, Mentor, Student, StudentAssessment } from '../lib/models';
import { X, Plus, ClipboardCheck, Users, Trash2, UserPlus } from 'lucide-react';
import StudentReportCard from './StudentReportCard';

interface Props {
    user: Teacher | Mentor;
    userType: 'teacher' | 'mentor';
    schoolId: string;
    onClose: () => void;
    initialThemeId?: number;
}

const THEME_7_CONFIG: Record<'H1' | 'H2' | 'H3', any[]> = {
    H1: [
        {
            title: "Language Skills",
            questions: [
                { id: "s7_h1_l1", text: "Able to identify domestic animals" },
                { id: "s7_h1_l2", text: "Able to identify wild animals" },
                { id: "s7_h1_l3", text: "Able to identify sea animals" },
                { id: "s7_h1_l4", text: "Able to identify common birds" },
                { id: "s7_h1_l5", text: "Able to identify the initial sound of the given objects" },
                { id: "s7_h1_l6_l", text: "Able to identify the sounds of the letter: l" },
                { id: "s7_h1_l6_b", text: "Able to identify the sounds of the letter: b" },
                { id: "s7_h1_l6_u", text: "Able to identify the sounds of the letter: u" },
                { id: "s7_h1_l6_f", text: "Able to identify the sounds of the letter: f" },
                { id: "s7_h1_l6_h", text: "Able to identify the sounds of the letter: h" },
                { id: "s7_h1_l7", text: "Able to hold a book with two hands and flip through the pages" },
            ]
        },
        {
            title: "Cognitive Skills",
            questions: [
                { id: "s7_h1_c1", text: "Able to identify purple coloured objects" },
                { id: "s7_h1_c2", text: "Able to identify white coloured objects" },
                { id: "s7_h1_c3", text: "Able to differentiate between rough and smooth" },
                { id: "s7_h1_c4", text: "Able to identify the sounds of animals" },
                { id: "s7_h1_c5", text: "Able to associate numbers with objects (1 to 9)" },
                { id: "s7_h1_c6", text: "Able to identify numbers 1 to 9" },
            ]
        },
        {
            title: "Social, Spiritual and Emotional Skills",
            questions: [
                { id: "s7_h1_s1", text: "Enjoys rhyme time" },
                { id: "s7_h1_s2", text: "Participates in team games with enthusiasm" },
                { id: "s7_h1_s3", text: "Enjoys team games" },
            ]
        },
        {
            title: "Physical Development Skills",
            questions: [
                { id: "s7_h1_p1", text: "Able to balance self on a line of bricks" },
                { id: "s7_h1_p2", text: "Able to understand the importance of cleaning the nose" },
                { id: "s7_h1_p3", text: "Able to colour within the boundary" },
            ]
        }
    ],
    H2: [
        {
            title: "Language Skills",
            questions: [
                { id: "s7_h2_l1", text: "Able to identify domestic animals" },
                { id: "s7_h2_l2", text: "Able to identify wild animals" },
                { id: "s7_h2_l3", text: "Able to identify sea animals" },
                { id: "s7_h2_l4", text: "Able to identify common birds" },
                { id: "s7_h2_l5", text: "Able to identify the initial sound of the given objects" },
                { id: "s7_h2_l6", text: "Able to arrange alphabets a-z with the alphabet box" },
                { id: "s7_h2_l7", text: "Able to write alphabets a-z in notebook" },
                { id: "s7_h2_l8", text: "Match the capital letters to its small letters: S, A, N, M, I" },
                { id: "s7_h2_l9", text: "Blending of Group 1 to 4 letters" },
                { id: "s7_h2_l10", text: "Able to hold a book with two hands and flip through the pages" },
            ]
        },
        {
            title: "Cognitive Skills",
            questions: [
                { id: "s7_h2_c1", text: "Able to identify white coloured objects" },
                { id: "s7_h2_c2", text: "Able to identify purple coloured objects" },
                { id: "s7_h2_c3", text: "Able to differentiate between rough and smooth" },
                { id: "s7_h2_c4", text: "Able to differentiate between left and right" },
                { id: "s7_h2_c5", text: "Able to identify the sounds of animals and birds" },
                { id: "s7_h2_c6", text: "Able to count bundles of tens" },
                { id: "s7_h2_c7", text: "Able to write numbers in tens" },
            ]
        },
        {
            title: "Social, Spiritual and Emotional Skills",
            questions: [
                { id: "s7_h2_s1", text: "Enjoys rhyme time" },
                { id: "s7_h2_s2", text: "Participates in team games with enthusiasm" },
                { id: "s7_h2_s3", text: "Enjoys team games" },
            ]
        },
        {
            title: "Physical Development Skills",
            questions: [
                { id: "s7_h2_p1", text: "Able to understand the importance of cleaning the nose" },
                { id: "s7_h2_p2", text: "Able to colour within the boundary" },
            ]
        }
    ],
    H3: [
        {
            title: "Language Skills",
            questions: [
                { id: "s7_h3_l1", text: "Able to identify domestic animals and their young ones" },
                { id: "s7_h3_l2", text: "Able to identify wild animals" },
                { id: "s7_h3_l3", text: "Able to identify sea animals" },
                { id: "s7_h3_l4", text: "Able to identify common birds" },
                { id: "s7_h3_l5_er", text: "Able to identify the sounds of the digraph: er" },
                { id: "s7_h3_l5_ar", text: "Able to identify the sounds of the digraph: ar" },
                { id: "s7_h3_l6", text: "Able to write rhyming words for the given words" },
                { id: "s7_h3_l7", text: "Able to identify and read the comm words - (List 4)" },
                { id: "s7_h3_l8", text: "Able to blend and read words with the given digraphs" },
            ]
        },
        {
            title: "Cognitive Skills",
            questions: [
                { id: "s7_h3_c1", text: "Able to identify shades of purple" },
                { id: "s7_h3_c2", text: "Able to differentiate between rough and smooth" },
                { id: "s7_h3_c3", text: "Able to differentiate between left and right" },
                { id: "s7_h3_c4", text: "Able to identify the sounds of animals and birds" },
            ]
        },
        {
            title: "Social, Spiritual and Emotional Skills",
            questions: [
                { id: "s7_h3_s1", text: "Enjoys rhyme time" },
                { id: "s7_h3_s2", text: "Participates in team games with enthusiasm" },
                { id: "s7_h3_s3", text: "Enjoys team games" },
            ]
        },
        {
            title: "Physical Development Skills",
            questions: [
                { id: "s7_h3_p1", text: "Able to understand the importance of cleaning the nose" },
            ]
        }
    ]
};

const THEME_2_CONFIG: Record<'H1' | 'H2' | 'H3', any[]> = {
    H1: [
        {
            title: "Language Skills",
            questions: [
                { id: "s2_h1_l1", text: "Able to identify parts of the body" },
                { id: "s2_h1_l2", text: "Able to introduce self" },
                { id: "s2_h1_l3", text: "Able to identify family members" },
                { id: "s2_h1_l4", text: "Able to say his/her friend's names" },
                { id: "s2_h1_l5", text: "Able to name the people in the picture- My Family" },
                { id: "s2_h1_l6", text: "Able to identify the given pictures" },
            ]
        },
        {
            title: "Cognitive Skills",
            questions: [
                { id: "s2_h1_c1", text: "Able to identify a circle" },
                { id: "s2_h1_c2", text: "Able to differentiate between long /short" },
                { id: "s2_h1_c3", text: "Able to differentiate between on/under" },
                { id: "s2_h1_c4", text: "Able to count quantities-1 & 2" },
                { id: "s2_h1_c5", text: "Able to identify colours-Blue" },
            ]
        },
        {
            title: "Social, Spiritual and Emotional Skills",
            questions: [
                { id: "s2_h1_s1", text: "Able to follow etiquettes of circle time" },
                { id: "s2_h1_s2", text: "Able to follow rules while winding up after activities" },
            ]
        },
        {
            title: "Physical Development skills",
            questions: [
                { id: "s2_h1_p1", text: "Able to walk on the straight line" },
                { id: "s2_h1_p2", text: "Able to walk on the zig zag line" },
            ]
        }
    ],
    H2: [
        {
            title: "Language Skills",
            questions: [
                { id: "s2_h2_l1", text: "Able to identify parts of the body" },
                { id: "s2_h2_l2", text: "Able to introduce self" },
                { id: "s2_h2_l3", text: "Able to identify family members" },
                { id: "s2_h2_l4", text: "Able to say his/her friend's names" },
                { id: "s2_h2_l5", text: "Able to name the people in the picture- My Family" },
                { id: "s2_h2_l6", text: "Able to identify the given pictures" },
            ]
        },
        {
            title: "Cognitive Skills",
            questions: [
                { id: "s2_h2_c1", text: "Able to identify a circle" },
                { id: "s2_h2_c2", text: "Able to differentiate between long /short" },
                { id: "s2_h2_c3", text: "Able to differentiate between in/out" },
                { id: "s2_h2_c4", text: "Able to count quantities-1 to 4" },
                { id: "s2_h2_c5", text: "Able to identify colours-Blue" },
            ]
        },
        {
            title: "Social, Spiritual and Emotional Skills",
            questions: [
                { id: "s2_h2_s1", text: "Able to follow etiquettes of circle time" },
                { id: "s2_h2_s2", text: "Able to follow rules while winding up after activities" },
            ]
        },
        {
            title: "Physical Development skills",
            questions: [
                { id: "s2_h2_p1", text: "Able to walk on the straight line" },
                { id: "s2_h2_p2", text: "Able to walk on the zig zag line" },
            ]
        }
    ],
    H3: [
        {
            title: "Language Skills",
            questions: [
                { id: "s2_h3_l1", text: "Able to follow instructions" },
                { id: "s2_h3_l2", text: "Able to blend and read words from group 3 and 4" },
                { id: "s2_h3_l3", text: "Able to write words from Group 3 and 4" },
                { id: "s2_h3_l4", text: "Able to identify family members" },
                { id: "s2_h3_l5", text: "Able to say his/her friend's names" },
                { id: "s2_h3_l6", text: "Able to identify action words" },
                { id: "s2_h3_l7", text: "Able to point at pictures in a book and flip through the pages" },
                { id: "s2_h3_l8", text: "Able to identify lowercase letters" },
            ]
        },
        {
            title: "Cognitive Skills",
            questions: [
                { id: "s2_h3_c1", text: "Able to identify oval shaped objects" },
                { id: "s2_h3_c2", text: "Able to differentiate between tall /short" },
                { id: "s2_h3_c3", text: "Able to differentiate between in/out" },
                { id: "s2_h3_c4", text: "Able to identify shades of blue" },
                { id: "s2_h3_c5", text: "Able to write numbers in tens" },
            ]
        },
        {
            title: "Social, Spiritual and Emotional Skills",
            questions: [
                { id: "s2_h3_s1", text: "Able to follow etiquettes of circle time" },
                { id: "s2_h3_s2", text: "Able to follow rules while winding up after activities" },
            ]
        },
        {
            title: "Physical Development skills",
            questions: [
                { id: "s2_h3_p1", text: "Able to walk on the straight line" },
                { id: "s2_h3_p2", text: "Able to walk on the zig zag line" },
            ]
        }
    ]
};

const THEME_6_CONFIG: Record<'H1' | 'H2' | 'H3', any[]> = {
    H1: [
        {
            title: "Language Skills",
            questions: [
                { id: "s6_h1_l1", text: "Able to identify parts of a plant." },
                { id: "s6_h1_l2", text: "Able to identify common flowers." },
                { id: "s6_h1_l3", text: "Able to identify common insects." },
                { id: "s6_h1_l4", text: "Able to identify the initial sound of the given objects." },
                { id: "s6_h1_l5_d", text: "Able to identify the sounds of the given letters: d" },
                { id: "s6_h1_l5_c", text: "Able to identify the sounds of the given letters: c" },
                { id: "s6_h1_l5_k", text: "Able to identify the sounds of the given letters: k" },
                { id: "s6_h1_l5_o", text: "Able to identify the sounds of the given letters: o" },
                { id: "s6_h1_l5_g", text: "Able to identify the sounds of the given letters: g" },
                { id: "s6_h1_l6", text: "Able to hold a book with two hands and flip through the pages." },
            ]
        },
        {
            title: "Cognitive Skills",
            questions: [
                { id: "s6_h1_c1", text: "Able to identify orange coloured objects." },
                { id: "s6_h1_c2", text: "Able to differentiate between in and out." },
                { id: "s6_h1_c3", text: "Able to differentiate between pleasant and unpleasant smell." },
                { id: "s6_h1_c4", text: "Able to associate numbers with objects (1 to 7)" },
                { id: "s6_h1_c5", text: "Able to understand the concept of zero." },
                { id: "s6_h1_c6", text: "Able to identify numbers 1 to 7." },
                { id: "s6_h1_c7", text: "Able to identify stars." },
            ]
        },
        {
            title: "Social, Spiritual and Emotional Skills",
            questions: [
                { id: "s6_h1_s1", text: "Enjoys rhyme time" },
                { id: "s6_h1_s2", text: "Participates in team games with enthusiasm" },
                { id: "s6_h1_s3", text: "Understand the importance of hygiene practices after coming from the garden." },
                { id: "s6_h1_s4", text: "Enjoys team games" },
            ]
        },
        {
            title: "Physical Development Skills",
            questions: [
                { id: "s6_h1_p1", text: "Able to hold a pencil using a tripod grip." },
                { id: "s6_h1_p2", text: "Able to jump with two feet" },
                { id: "s6_h1_p3", text: "Able to colour within the boundary." },
            ]
        }
    ],
    H2: [
        {
            title: "Language Skills",
            questions: [
                { id: "s6_h2_l1", text: "Able to identify parts of a plant." },
                { id: "s6_h2_l2", text: "Able to identify common flowers." },
                { id: "s6_h2_l3", text: "Able to identify common insects." },
                { id: "s6_h2_l4", text: "Able to identify the initial sound of the given objects." },
                { id: "s6_h2_l5_v", text: "Able to identify the sounds of the given letters: v" },
                { id: "s6_h2_l5_w", text: "Able to identify the sounds of the given letters: w" },
                { id: "s6_h2_l5_x", text: "Able to identify the sounds of the given letters: x" },
                { id: "s6_h2_l5_y", text: "Able to identify the sounds of the given letters: y" },
                { id: "s6_h2_l5_z", text: "Able to identify the sounds of the given letters: z" },
                { id: "s6_h2_l5_q", text: "Able to identify the sounds of the given letters: q" },
                { id: "s6_h2_l6", text: "Able to hold a book with two hands and flip through the pages." },
            ]
        },
        {
            title: "Cognitive Skills",
            questions: [
                { id: "s6_h2_c1", text: "Able to identify orange coloured objects." },
                { id: "s6_h2_c2", text: "Able to differentiate between in and out." },
                { id: "s6_h2_c3", text: "Able to differentiate between pleasant and unpleasant smell." },
                { id: "s6_h2_c4", text: "Able to identify the sounds of insects." },
                { id: "s6_h2_c5", text: "Able to associate numbers with objects." },
                { id: "s6_h2_c6", text: "Able to identify the number 1 to 10." },
                { id: "s6_h2_c7", text: "Able to identify star" },
            ]
        },
        {
            title: "Social, Spiritual and Emotional Skills",
            questions: [
                { id: "s6_h2_s1", text: "Enjoys rhyme time" },
                { id: "s6_h2_s2", text: "Participates in team games with enthusiasm" },
                { id: "s6_h2_s3", text: "Understand the importance of hygiene practices after coming from the garden." },
                { id: "s6_h2_s4", text: "Enjoys team games" },
            ]
        },
        {
            title: "Physical Development Skills",
            questions: [
                { id: "s6_h2_p1", text: "Able to jump with two feet" },
                { id: "s6_h2_p2", text: "Able to colour within the boundary." },
            ]
        }
    ],
    H3: [
        {
            title: "Language Skills",
            questions: [
                { id: "s6_h3_l1", text: "Able to identify parts of a plant." },
                { id: "s6_h3_l2", text: "Able to identify common flowers." },
                { id: "s6_h3_l3", text: "Able to identify common insects." },
                { id: "s6_h3_l4_oo_s", text: "Able to identify the sounds of the given digraphs: Short oo" },
                { id: "s6_h3_l4_oo_l", text: "Able to identify the sounds of the given digraphs: Long oo" },
                { id: "s6_h3_l4_oi", text: "Able to identify the sounds of the given digraphs: oi" },
                { id: "s6_h3_l4_ou", text: "Able to identify the sounds of the given digraphs: ou" },
                { id: "s6_h3_l5", text: "Able to point at pictures in a book and flip through the pages." },
            ]
        },
        {
            title: "Cognitive Skills",
            questions: [
                { id: "s6_h3_c1", text: "Able to identify shades of orange." },
                { id: "s6_h3_c2", text: "Able to differentiate between on and under." },
                { id: "s6_h3_c3", text: "Able to differentiate between pleasant and unpleasant smell." },
                { id: "s6_h3_c4", text: "Read and write numbers from 1 to 100." },
                { id: "s6_h3_c5", text: "Read and write number names from 1 to 10." },
                { id: "s6_h3_c6", text: "Able to identify a star." },
            ]
        },
        {
            title: "Social, Spiritual and Emotional Skills",
            questions: [
                { id: "s6_h3_s1", text: "Enjoys rhyme time" },
                { id: "s6_h3_s2", text: "Participates in team games with enthusiasm" },
                { id: "s6_h3_s3", text: "Understand the importance of hygiene practices after coming from the garden." },
                { id: "s6_h3_s4", text: "Enjoys team games" },
            ]
        },
        {
            title: "Physical Development Skills",
            questions: [
                { id: "s6_h3_p1", text: "Able to jump with two feet" },
            ]
        }
    ]
};

const THEME_5_CONFIG: Record<'H1' | 'H2' | 'H3', any[]> = {
    H1: [
        {
            title: "Language Skills",
            questions: [
                { id: "s5_h1_l1", text: "Able to identify the community helpers" },
                { id: "s5_h1_l2", text: "Able to match the community helpers with their tools" },
                { id: "s5_h1_l3", text: "Able to identify the initial sound of the given objects." },
                { id: "s5_h1_l4_i", text: "Able to identify the sounds of the given letters: i" },
                { id: "s5_h1_l4_p", text: "Able to identify the sounds of the given letters: p" },
                { id: "s5_h1_l4_t", text: "Able to identify the sounds of the given letters: t" },
                { id: "s5_h1_l4_r", text: "Able to identify the sounds of the given letters: r" },
            ]
        },
        {
            title: "Cognitive Skills",
            questions: [
                { id: "s5_h1_c1", text: "Able to identify pink coloured objects." },
                { id: "s5_h1_c2", text: "Able to differentiate between sit and stand." },
                { id: "s5_h1_c3", text: "Able to differentiate between full and empty." },
                { id: "s5_h1_c4", text: "Able to identify the sounds of the tools of community helpers." },
                { id: "s5_h1_c5", text: "Able to associate numbers with objects.(0, 1to6)" },
                { id: "s5_h1_c6", text: "Able to identify the number 0,1to6." },
                { id: "s5_h1_c7", text: "Able to identify all the four basic shapes." },
            ]
        },
        {
            title: "Social, Spiritual and Emotional Skills",
            questions: [
                { id: "s5_h1_s1", text: "Enjoys rhyme time" },
                { id: "s5_h1_s2", text: "Participates in classroom activities with enthusiasm" },
            ]
        },
        {
            title: "Physical Development Skills",
            questions: [
                { id: "s5_h1_p1", text: "Able to hold a pencil using a tripod grip." },
                { id: "s5_h1_p2", text: "Able to colour within the boundary." },
                { id: "s5_h1_p3", text: "Able to balance objects on the head." },
            ]
        }
    ],
    H2: [
        {
            title: "Language Skills",
            questions: [
                { id: "s5_h2_l1", text: "Able to identify the community helpers" },
                { id: "s5_h2_l2", text: "Able to match the community helpers with their tools" },
                { id: "s5_h2_l3", text: "Able to blend and read words formed with group 1 & 2 letter" },
                { id: "s5_h2_l4_b", text: "Able to identify the sounds of the given letters: b" },
                { id: "s5_h2_l4_u", text: "Able to identify the sounds of the given letters: u" },
                { id: "s5_h2_l4_f", text: "Able to identify the sounds of the given letters: f" },
                { id: "s5_h2_l4_h", text: "Able to identify the sounds of the given letters: h" },
                { id: "s5_h2_l4_j", text: "Able to identify the sounds of the given letters: j" },
                { id: "s5_h2_l4_e", text: "Able to identify the sounds of the given letters: e" },
            ]
        },
        {
            title: "Cognitive Skills",
            questions: [
                { id: "s5_h2_c1", text: "Able to identify pink coloured objects." },
                { id: "s5_h2_c2", text: "Able to differentiate between sit and stand." },
                { id: "s5_h2_c3", text: "Able to differentiate between full and empty." },
                { id: "s5_h2_c4", text: "Able to identify the sounds of the tools of community helpers." },
                { id: "s5_h2_c5", text: "Able to associate numbers with objects. (0,1-8)" },
                { id: "s5_h2_c6", text: "Able to identify numbers 0,1-8." },
                { id: "s5_h2_c7", text: "Able to identify oval shaped objects." },
            ]
        },
        {
            title: "Social, Spiritual and Emotional Skills",
            questions: [
                { id: "s5_h2_s1", text: "Enjoys rhyme time" },
                { id: "s5_h2_s2", text: "Participates in classroom activities with enthusiasm" },
                { id: "s5_h2_s3", text: "Enjoys team games" },
            ]
        },
        {
            title: "Physical Development Skills",
            questions: [
                { id: "s5_h2_p1", text: "Able to hold a pencil using a tripod grip." },
                { id: "s5_h2_p2", text: "Able to colour with even strokes." },
                { id: "s5_h2_p3", text: "Able to balance objects on the head." },
            ]
        }
    ],
    H3: [
        {
            title: "Language Skills",
            questions: [
                { id: "s5_h3_l1", text: "Able to read the names of the community helpers.(List 1 )" },
                { id: "s5_h3_l2", text: "Able to read the names of the community helpers.(List 2 )" },
                { id: "s5_h3_l3", text: "Able to match the community helpers with their tools." },
                { id: "s5_h3_l4", text: "Able to read Comm. Words (List 3)." },
                { id: "s5_h3_l5", text: "Able to write Comm. Words from List 3." },
                { id: "s5_h3_l6_sh", text: "Able to blend and read 'sh' words." },
                { id: "s5_h3_l6_ng", text: "Able to blend and read 'ng' words." },
                { id: "s5_h3_l6_ch", text: "Able to blend and read 'ch' words." },
                { id: "s5_h3_l6_th", text: "Able to blend and read 'th' words." },
                { id: "s5_h3_l7", text: "Able to write words with 'sh','ng','th' and 'ch' digraphs." },
                { id: "s5_h3_l8", text: "Able to copy simple sentences." },
                { id: "s5_h3_l9", text: "Able to read sentences." },
            ]
        },
        {
            title: "Cognitive Skills",
            questions: [
                { id: "s5_h3_c1", text: "Able to identify different shades of pink." },
                { id: "s5_h3_c2", text: "Able to differentiate between sit and stand." },
                { id: "s5_h3_c3", text: "Able to differentiate between full and empty." },
                { id: "s5_h3_c4", text: "Able to draw a cone" },
                { id: "s5_h3_c5", text: "Able to identify odd and even numbers" },
                { id: "s5_h3_c6", text: "Able to identify numbers 11 to 19(Orally Eleven, Twelve,........)" },
            ]
        },
        {
            title: "Social, Spiritual and Emotional Skills",
            questions: [
                { id: "s5_h3_s1", text: "Enjoys rhyme time" },
                { id: "s5_h3_s2", text: "Participates in classroom activities with enthusiasm" },
                { id: "s5_h3_s3", text: "Enjoys team games" },
            ]
        },
        {
            title: "Physical Development Skills",
            questions: [
                { id: "s5_h3_p1", text: "Able to hold a pencil using a tripod grip." },
                { id: "s5_h3_p2", text: "Able to leave a finger space between words." },
                { id: "s5_h3_p3", text: "Able to follow instructions." },
                { id: "s5_h3_p4", text: "Able to colour with even strokes." },
                { id: "s5_h3_p5", text: "Able to balance objects on the head." },
            ]
        }
    ]
};

const THEME_4_CONFIG: Record<'H1' | 'H2' | 'H3', any[]> = {
    H1: [
        {
            title: "Language Skills",
            questions: [
                { id: "s4_h1_l1", text: "Able to say the names of the objects in the pictures." },
                { id: "s4_h1_l2", text: "Able to identify list 1 vehicles." },
                { id: "s4_h1_l3", text: "Able to identify list 2 vehicles." },
                { id: "s4_h1_l4", text: "Able to differentiate between modes of transport" },
                { id: "s4_h1_l5_s", text: "Able to identify objects that begin with the sounds: s" },
                { id: "s4_h1_l5_m", text: "Able to identify objects that begin with the sounds: m" },
                { id: "s4_h1_l5_n", text: "Able to identify objects that begin with the sounds: n" },
                { id: "s4_h1_l5_a", text: "Able to identify objects that begin with the sounds: a" },
                { id: "s4_h1_l6", text: "Able to participate in group activities" },
            ]
        },
        {
            title: "Cognitive Skills",
            questions: [
                { id: "s4_h1_c1", text: "Able to identify square shaped objects" },
                { id: "s4_h1_c2", text: "Able to identify numbers 1 to 5" },
                { id: "s4_h1_c3", text: "Able to identify and associate numbers with objects/quantities" },
                { id: "s4_h1_c4", text: "Able to trace number 4 and 5" },
                { id: "s4_h1_c5", text: "Able to identify the colour green" },
                { id: "s4_h1_c6", text: "Able to differentiate between heavy and light" },
                { id: "s4_h1_c7", text: "Able to differentiate between the start and end" },
            ]
        },
        {
            title: "Social, Spiritual and Emotional Skills",
            questions: [
                { id: "s4_h1_s1", text: "Able to enjoy rhyme time" },
                { id: "s4_h1_s2", text: "Able to work together in a team" },
            ]
        },
        {
            title: "Physical Development Skills",
            questions: [
                { id: "s4_h1_p1", text: "Able to climb the stairs" },
                { id: "s4_h1_p2", text: "Able to follow the instructions." },
            ]
        }
    ],
    H2: [
        {
            title: "Language Skills",
            questions: [
                { id: "s4_h2_l1", text: "Able to say the names of the objects in the pictures." },
                { id: "s4_h2_l2", text: "Able to identify list 1 vehicles." },
                { id: "s4_h2_l3", text: "Able to identify list 2 vehicles." },
                { id: "s4_h2_l4", text: "Able to differentiate between modes of transport." },
                { id: "s4_h2_l5", text: "Able to identify the colors of the traffic signal." },
                { id: "s4_h2_l6_r", text: "Able to recognise objects that begin with the sounds of letters- r" },
                { id: "s4_h2_l6_d", text: "Able to recognise objects that begin with the sounds of letters- d" },
                { id: "s4_h2_l6_c", text: "Able to recognise objects that begin with the sounds of letters- c" },
                { id: "s4_h2_l6_k", text: "Able to recognise objects that begin with the sounds of letters- k" },
                { id: "s4_h2_l6_o", text: "Able to recognise objects that begin with the sounds of letters- o" },
                { id: "s4_h2_l6_g", text: "Able to recognise objects that begin with the sounds of letters- g" },
                { id: "s4_h2_l6_l", text: "Able to recognise objects that begin with the sounds of letters- l" },
                { id: "s4_h2_l7", text: "Able to participate in group activities (Chinese whisper)" },
            ]
        },
        {
            title: "Cognitive Skills",
            questions: [
                { id: "s4_h2_c1", text: "Able to recognize square shaped objects" },
                { id: "s4_h2_c2", text: "Able to identify and associate numbers with objects (1 to 6)" },
                { id: "s4_h2_c3", text: "Able to write numbers 0, 5 and 6" },
                { id: "s4_h2_c4", text: "Able to identify the colour green" },
                { id: "s4_h2_c5", text: "Able to differentiate between heavy and light." },
                { id: "s4_h2_c6", text: "Able to differentiate between the start and finish of an activity." },
            ]
        },
        {
            title: "Social, Spiritual and Emotional Skills",
            questions: [
                { id: "s4_h2_s1", text: "Able to enjoy rhyme time" },
                { id: "s4_h2_s2", text: "Able to work together in a team" },
            ]
        },
        {
            title: "Physical Development skills",
            questions: [
                { id: "s4_h2_p1", text: "Able to climb the stairs" },
                { id: "s4_h2_p2", text: "Able to follow the instructions." },
            ]
        }
    ],
    H3: [
        {
            title: "Language Skills",
            questions: [
                { id: "s4_h3_l1", text: "Able to read the names of vehicles of list 1." },
                { id: "s4_h3_l2", text: "Able to read the names of vehicles of list 2." },
                { id: "s4_h3_l3", text: "Able to differentiate between modes of transport." },
                { id: "s4_h3_l4", text: "Able to speak few sentences about the pictures." },
                { id: "s4_h3_l5_ee", text: "Able to blend and write 'ee' words" },
                { id: "s4_h3_l5_ie", text: "Able to blend and write 'ie' words" },
                { id: "s4_h3_l5_oa", text: "Able to blend and write 'oa' words" },
                { id: "s4_h3_l5_ue", text: "Able to blend and write 'ue' words" },
                { id: "s4_h3_l6", text: "Able to participate in group activities (Chinese whisper)" },
            ]
        },
        {
            title: "Cognitive Skills",
            questions: [
                { id: "s4_h3_c1", text: "Able to recognize cylinder shaped objects." },
                { id: "s4_h3_c2", text: "Able to differentiate between heavy and light" },
                { id: "s4_h3_c3", text: "Able to differentiate between start and finish" },
                { id: "s4_h3_c4", text: "Able to identify odd one out" },
                { id: "s4_h3_c5", text: "Able to identify the colour green" },
                { id: "s4_h3_c6", text: "Able to write numbers from 21to 100" },
                { id: "s4_h3_c7", text: "Able to write after numbers and inbetween from 21-100" },
                { id: "s4_h3_c8", text: "Able to write numbers from 1 to 10 & 21to 100" },
            ]
        },
        {
            title: "Social, Spiritual and Emotional Skills",
            questions: [
                { id: "s4_h3_s1", text: "Able to enjoy and sing rhymes." },
                { id: "s4_h3_s2", text: "Able to work together in a team" },
            ]
        },
        {
            title: "Physical Development skills",
            questions: [
                { id: "s4_h3_p1", text: "Able to climb the stairs" },
                { id: "s4_h3_p2", text: "Able to follow instructions." },
            ]
        }
    ]
};

const THEME_8_CONFIG: Record<'H1' | 'H2' | 'H3', any[]> = {
    H1: [
        {
            title: "Language Skills",
            questions: [
                { id: "s8_h1_l1", text: "Able to identify different seasons" },
                { id: "s8_h1_l2", text: "Able to identify clothes worn in different seasons" },
                { id: "s8_h1_l3", text: "Able to identify food we eat in different seasons" },
                { id: "s8_h1_l4", text: "Able to identify the initial sound of the given objects" },
                { id: "s8_h1_l5_j", text: "Able to identify the sounds of the letter: j" },
                { id: "s8_h1_l5_e", text: "Able to identify the sounds of the letter: e" },
                { id: "s8_h1_l5_v", text: "Able to identify the sounds of the letter: v" },
                { id: "s8_h1_l5_w", text: "Able to identify the sounds of the letter: w" },
                { id: "s8_h1_l5_x", text: "Able to identify the sounds of the letter: x" },
                { id: "s8_h1_l6", text: "Able to hold a book with two hands and flip through the pages" },
            ]
        },
        {
            title: "Cognitive Skills",
            questions: [
                { id: "s8_h1_c1", text: "Able to identify grey coloured objects" },
                { id: "s8_h1_c2", text: "Able to identify brown coloured objects" },
                { id: "s8_h1_c3", text: "Able to differentiate between first and last" },
                { id: "s8_h1_c4", text: "Able to differentiate between hot and cold" },
                { id: "s8_h1_c5", text: "Able to identify patterns" },
                { id: "s8_h1_c6", text: "Able to identify similarities in objects (One to one correspondence)" },
                { id: "s8_h1_c7", text: "Able to associate numbers with objects (1 to 10)" },
                { id: "s8_h1_c8", text: "Able to write numbers from 1 to 10" },
            ]
        },
        {
            title: "Social, Spiritual and Emotional Skills",
            questions: [
                { id: "s8_h1_s1", text: "Enjoys rhyme time" },
                { id: "s8_h1_s2", text: "Participates in team games with enthusiasm" },
                { id: "s8_h1_s3", text: "Enjoys team games" },
            ]
        },
        {
            title: "Physical Development Skills",
            questions: [
                { id: "s8_h1_p1", text: "Able to hold a pencil using a tripod grip" },
                { id: "s8_h1_p2", text: "Able to unzip and zip clothes" },
                { id: "s8_h1_p3", text: "Able to identify safe and unsafe habits in different seasons" },
                { id: "s8_h1_p4", text: "Able to colour within the boundary" },
            ]
        }
    ],
    H2: [
        {
            title: "Language Skills",
            questions: [
                { id: "s8_h2_l1", text: "Able to identify different seasons" },
                { id: "s8_h2_l2", text: "Able to identify clothes worn in different seasons" },
                { id: "s8_h2_l3", text: "Able to identify food we eat in different seasons" },
                { id: "s8_h2_l4", text: "Able to identify the initial sound of the given objects" },
                { id: "s8_h2_l5_g1", text: "Able to identify the sounds of capital letters: Group 1" },
                { id: "s8_h2_l5_g2", text: "Able to identify the sounds of capital letters: Group 2" },
                { id: "s8_h2_l5_g3", text: "Able to identify the sounds of capital letters: Group 3" },
                { id: "s8_h2_l6", text: "Able to hold a book with two hands and flip through the pages" },
            ]
        },
        {
            title: "Cognitive Skills",
            questions: [
                { id: "s8_h2_c1", text: "Able to identify brown coloured objects" },
                { id: "s8_h2_c2", text: "Able to differentiate between beginning and end" },
                { id: "s8_h2_c3", text: "Able to identify patterns" },
                { id: "s8_h2_c4", text: "Able to identify similarities in objects (One to one correspondence)" },
                { id: "s8_h2_c5", text: "Able to associate numbers in tens with objects" },
                { id: "s8_h2_c6", text: "Able to read and write numbers from 1 to 50" },
            ]
        },
        {
            title: "Social, Spiritual and Emotional Skills",
            questions: [
                { id: "s8_h2_s1", text: "Enjoys rhyme time" },
                { id: "s8_h2_s2", text: "Participates in team games with enthusiasm" },
                { id: "s8_h2_s3", text: "Enjoys team games" },
            ]
        },
        {
            title: "Physical Development Skills",
            questions: [
                { id: "s8_h2_p1", text: "Able to hold a pencil using a tripod grip" },
                { id: "s8_h2_p2", text: "Able to button and zip clothes" },
                { id: "s8_h2_p3", text: "Able to identify safe and unsafe habits in different seasons" },
                { id: "s8_h2_p4", text: "Able to colour within the boundary" },
            ]
        }
    ],
    H3: [
        {
            title: "Language Skills",
            questions: [
                { id: "s8_h3_l1", text: "Able to identify different seasons" },
                { id: "s8_h3_l2", text: "Able to identify clothes worn in different seasons" },
                { id: "s8_h3_l3", text: "Able to identify food we eat in different seasons" },
                { id: "s8_h3_l4", text: "Able to identify action words" },
                { id: "s8_h3_l5", text: "Able to identify the opposite of the given word" },
                { id: "s8_h3_l6", text: "Able to use 'these' and 'those' sentences" },
                { id: "s8_h3_l7", text: "Able to use in, on, under in sentences" },
                { id: "s8_h3_l8", text: "Able to say a word that rhymes with the given word" },
                { id: "s8_h3_l9", text: "Able to point at pictures in a book and flip through the pages" },
            ]
        },
        {
            title: "Cognitive Skills",
            questions: [
                { id: "s8_h3_c1", text: "Able to identify shades of brown" },
                { id: "s8_h3_c2", text: "Able to differentiate between beginning and end" },
                { id: "s8_h3_c3", text: "Able to identify patterns" },
                { id: "s8_h3_c4", text: "Able to identify similarities in objects (One to one correspondence)" },
                { id: "s8_h3_c5", text: "Able to add two numbers" },
                { id: "s8_h3_c6", text: "Able to subtract numbers" },
                { id: "s8_h3_c7", text: "Able to read and write number names from 11 to 99" },
            ]
        },
        {
            title: "Social, Spiritual and Emotional Skills",
            questions: [
                { id: "s8_h3_s1", text: "Enjoys rhyme time" },
                { id: "s8_h3_s2", text: "Participates in team games with enthusiasm" },
                { id: "s8_h3_s3", text: "Enjoys team games" },
            ]
        },
        {
            title: "Physical Development Skills",
            questions: [
                { id: "s8_h3_p1", text: "Able to hold a pencil using a tripod grip" },
                { id: "s8_h3_p2", text: "Able to button and zip clothes" },
                { id: "s8_h3_p3", text: "Able to identify safe and unsafe habits in different seasons" },
                { id: "s8_h3_p4", text: "Able to colour within the boundary" },
            ]
        }
    ]
};

const THEME_1_CONFIG: Record<'H1' | 'H2' | 'H3', any[]> = {
    H1: [
        {
            title: "Language Skills",
            questions: [
                { id: "s1_h1_l1", text: "Able to follow instructions" },
                { id: "s1_h1_l2", text: "Able to introduce self" },
                { id: "s1_h1_l3", text: "Identify the given objects" },
            ]
        },
        {
            title: "Cognitive Skills",
            questions: [
                { id: "s1_h1_c1", text: "Able to identify red colour" },
                { id: "s1_h1_c2", text: "Able to differentiate between big and small" },
                { id: "s1_h1_c3", text: "Able to Identify objects in the classroom" },
                { id: "s1_h1_c4", text: "Able to identify similar objects" },
                { id: "s1_h1_c5", text: "Able to identify different areas in school" },
            ]
        },
        {
            title: "Social, Spiritual and Emotional Skills",
            questions: [
                { id: "s1_h1_s1", text: "Happy at school" },
                { id: "s1_h1_s2", text: "Overall settled at school" },
                { id: "s1_h1_s3", text: "Able to keep things in allotted place" },
                { id: "s1_h1_s4", text: "Able to follow the etiquettes of drinking water" },
                { id: "s1_h1_s5", text: "Able to follow the etiquettes of eating" },
            ]
        }
    ],
    H2: [
        {
            title: "Language Skills",
            questions: [
                { id: "s1_h2_l1", text: "Able to follow instructions" },
                { id: "s1_h2_l2", text: "Able to introduce self" },
                { id: "s1_h2_l3", text: "Able to identify the pictures" },
                { id: "s1_h2_l4", text: "Identify the given objects with initial sound" },
            ]
        },
        {
            title: "Cognitive Skills",
            questions: [
                { id: "s1_h2_c1", text: "Able to identify red colour" },
                { id: "s1_h2_c2", text: "Able to Identify objects in the classroom" },
                { id: "s1_h2_c3", text: "Able to identify similar objects" },
                { id: "s1_h2_c4", text: "Able to identify rectangular shape objects" },
                { id: "s1_h2_c5", text: "Able to differentiate between big and small" },
                { id: "s1_h2_c6", text: "Able to identify different areas in school" },
            ]
        },
        {
            title: "Social, Spiritual and Emotional Skills",
            questions: [
                { id: "s1_h2_s1", text: "Happy at school" },
                { id: "s1_h2_s2", text: "Overall settled at school" },
                { id: "s1_h2_s3", text: "Able to keep things in allotted place" },
                { id: "s1_h2_s4", text: "Able to follow the etiquettes of drinking water" },
                { id: "s1_h2_s5", text: "Able to follow the etiquettes of eating" },
            ]
        }
    ],
    H3: [
        {
            title: "Language Skills",
            questions: [
                { id: "s1_h3_l1_s", text: "Able to Identify the sounds of Group 1 letters: s" },
                { id: "s1_h3_l1_a", text: "Able to Identify the sounds of Group 1 letters: a" },
                { id: "s1_h3_l1_m", text: "Able to Identify the sounds of Group 1 letters: m" },
                { id: "s1_h3_l1_n", text: "Able to Identify the sounds of Group 1 letters: n" },
                { id: "s1_h3_l1_i", text: "Able to Identify the sounds of Group 1 letters: i" },
                { id: "s1_h3_l1_p", text: "Able to Identify the sounds of Group 1 letters: p" },
                { id: "s1_h3_l1_t", text: "Able to Identify the sounds of Group 1 letters: t" },
                { id: "s1_h3_l2_r", text: "Able to Identify the sounds of Group 2 letters: r" },
                { id: "s1_h3_l2_d", text: "Able to Identify the sounds of Group 2 letters: d" },
                { id: "s1_h3_l2_c", text: "Able to Identify the sounds of Group 2 letters: c" },
                { id: "s1_h3_l2_k", text: "Able to Identify the sounds of Group 2 letters: k" },
                { id: "s1_h3_l2_o", text: "Able to Identify the sounds of Group 2 letters: o" },
                { id: "s1_h3_l2_g", text: "Able to Identify the sounds of Group 2 letters: g" },
                { id: "s1_h3_l2_l", text: "Able to Identify the sounds of Group 2 letters: l" },
                { id: "s1_h3_l3", text: "Able to form lowercase letters from a-z" },
                { id: "s1_h3_l4", text: "Able to form uppercase letters from A-Z" },
                { id: "s1_h3_l5", text: "Able to blend and read group 1 letters" },
                { id: "s1_h3_l6", text: "Able to blend and read group 2 letters" },
            ]
        },
        {
            title: "Cognitive Skills",
            questions: [
                { id: "s1_h3_c1", text: "Able to differentiate between big and small" },
                { id: "s1_h3_c2", text: "Able to differentiate between thick and thin" },
                { id: "s1_h3_c3", text: "Able to Identify objects in the classroom" },
                { id: "s1_h3_c4", text: "Able to identify basic shapes" },
                { id: "s1_h3_c5", text: "Able to identify similar objects" },
                { id: "s1_h3_c6", text: "Able to identify different areas in school" },
            ]
        },
        {
            title: "Social, Spiritual and Emotional Skills",
            questions: [
                { id: "s1_h3_s1", text: "Happy at school" },
                { id: "s1_h3_s2", text: "Overall settled at school" },
                { id: "s1_h3_s3", text: "Able to keep things in allotted place" },
                { id: "s1_h3_s4", text: "Able to follow the etiquettes of drinking water" },
                { id: "s1_h3_s5", text: "Able to follow the etiquettes of eating" },
            ]
        }
    ]
};

const THEME_9_CONFIG: Record<'H1' | 'H2' | 'H3', any[]> = {
    H1: [
        {
            title: "Language Skills",
            questions: [
                { id: "s9_h1_l1", text: "Able to say/identify different uses of water" },
                { id: "s9_h1_l2", text: "Able to identify uses of air" },
                { id: "s9_h1_l3", text: "Able to differentiate activities between Day and Night" },
                { id: "s9_h1_l4", text: "Able to identify the initial sound of the given pictures" },
                { id: "s9_h1_l5_y", text: "Able to identify the initial sound: y" },
                { id: "s9_h1_l5_z", text: "Able to identify the initial sound: z" },
                { id: "s9_h1_l5_q", text: "Able to identify the initial sound: q" },
                { id: "s9_h1_l6", text: "Able to hold a book with two hands and flip through the pages" },
            ]
        },
        {
            title: "Cognitive Skills",
            questions: [
                { id: "s9_h1_c1", text: "Able to identify black coloured objects" },
                { id: "s9_h1_c2", text: "Able to differentiate between few and many" },
                { id: "s9_h1_c3", text: "Able to differentiate between far and near" },
                { id: "s9_h1_c4", text: "Able to identify patterns" },
                { id: "s9_h1_c5", text: "Able to associate numbers with objects (1 to 10)" },
                { id: "s9_h1_c6", text: "Able to write numbers from 1 to 10" },
            ]
        },
        {
            title: "Social, Spiritual and Emotional Skills",
            questions: [
                { id: "s9_h1_s1", text: "Enjoys rhyme time" },
                { id: "s9_h1_s2", text: "Participates in team games with enthusiasm" },
                { id: "s9_h1_s3", text: "Enjoys team games" },
            ]
        },
        {
            title: "Physical Development Skills",
            questions: [
                { id: "s9_h1_p1", text: "Able to hold a pencil using a tripod grip" },
                { id: "s9_h1_p2", text: "Enjoy exercises" },
                { id: "s9_h1_p3", text: "Able to hold and carry sharp objects safely like knife and scissors" },
                { id: "s9_h1_p4", text: "Able to colour within the boundary" },
            ]
        }
    ],
    H2: [
        {
            title: "Language Skills",
            questions: [
                { id: "s9_h2_l1", text: "Able to say/identify different uses of water" },
                { id: "s9_h2_l2", text: "Able to identify uses of air" },
                { id: "s9_h2_l3", text: "Able to differentiate activities between Day and Night" },
                { id: "s9_h2_l4", text: "Able to match upper case and lower case letters" },
                { id: "s9_h2_l5", text: "Able to identify vowels" },
                { id: "s9_h2_l6", text: "Able to say the opposite of given words" },
                { id: "s9_h2_l7", text: "Able to hold a book with two hands and flip through the pages" },
            ]
        },
        {
            title: "Cognitive Skills",
            questions: [
                { id: "s9_h2_c1", text: "Able to identify black coloured objects" },
                { id: "s9_h2_c2", text: "Able to differentiate between few and many" },
                { id: "s9_h2_c3", text: "Able to differentiate between far and near" },
                { id: "s9_h2_c4", text: "Able to identify patterns" },
                { id: "s9_h2_c5", text: "Able to identify similarities in objects (One to one correspondence)" },
                { id: "s9_h2_c6", text: "Able to identify all the shapes" },
                { id: "s9_h2_c7", text: "Able to read and write numbers from 11 to 19" },
                { id: "s9_h2_c8", text: "Able to identify numbers 1-100" },
            ]
        },
        {
            title: "Social, Spiritual and Emotional Skills",
            questions: [
                { id: "s9_h2_s1", text: "Enjoys rhyme time" },
                { id: "s9_h2_s2", text: "Participates in team games with enthusiasm" },
                { id: "s9_h2_s3", text: "Enjoys team games" },
            ]
        },
        {
            title: "Physical Development Skills",
            questions: [
                { id: "s9_h2_p1", text: "Able to hold a pencil using a tripod grip" },
                { id: "s9_h2_p2", text: "Enjoy exercises" },
                { id: "s9_h2_p3", text: "Able to hold and carry sharp objects safely like knife and scissors" },
                { id: "s9_h2_p4", text: "Able to colour within the boundary" },
            ]
        }
    ],
    H3: [
        {
            title: "Language Skills",
            questions: [
                { id: "s9_h3_l1", text: "Able to say/identify different uses of water" },
                { id: "s9_h3_l2", text: "Able to identify uses of air" },
                { id: "s9_h3_l3", text: "Able to differentiate activities between Day and Night" },
                { id: "s9_h3_l4", text: "Able to identify action words" },
                { id: "s9_h3_l5", text: "Able to identify the opposite of the given word" },
                { id: "s9_h3_l6", text: "Able to say Days of the weeks and Months of the year" },
                { id: "s9_h3_l7", text: "Able to identify the parts of the Day" },
                { id: "s9_h3_l8", text: "Able to say a word that rhymes with the given word" },
                { id: "s9_h3_l9", text: "Able to point at pictures in a book and flip through the pages" },
            ]
        },
        {
            title: "Cognitive Skills",
            questions: [
                { id: "s9_h3_c1", text: "Able to identify black coloured objects" },
                { id: "s9_h3_c2", text: "Able to differentiate between few and many" },
                { id: "s9_h3_c3", text: "Able to differentiate between far and near" },
                { id: "s9_h3_c4", text: "Able to differentiate between above and below" },
                { id: "s9_h3_c5", text: "Able to identify patterns" },
                { id: "s9_h3_c6", text: "Able to identify similarities in objects (One to one correspondence)" },
                { id: "s9_h3_c7", text: "Able to add two numbers" },
                { id: "s9_h3_c8", text: "Able to subtract numbers" },
                { id: "s9_h3_c9", text: "Able to read and write number names from 11 to 99." },
            ]
        },
        {
            title: "Social, Spiritual and Emotional Skills",
            questions: [
                { id: "s9_h3_s1", text: "Enjoys rhyme time" },
                { id: "s9_h3_s2", text: "Participates in team games with enthusiasm" },
                { id: "s9_h3_s3", text: "Enjoys team games" },
            ]
        },
        {
            title: "Physical Development Skills",
            questions: [
                { id: "s9_h3_p1", text: "Able to hold a pencil using a tripod grip" },
                { id: "s9_h3_p2", text: "Enjoy exercises" },
                { id: "s9_h3_p3", text: "Able to hold and carry sharp objects safely like knife and scissors" },
                { id: "s9_h3_p4", text: "Able to colour within the boundary" },
            ]
        }
    ]
};

export const THEMES = [
    { id: 1, name: "Theme 1: Beginnings", config: THEME_1_CONFIG },
    { id: 2, name: "Theme 2: All About Me", config: THEME_2_CONFIG },
    { id: 4, name: "Theme 4: Transportation", config: THEME_4_CONFIG },
    { id: 5, name: "Theme 5: Community Helpers", config: THEME_5_CONFIG },
    { id: 6, name: "Theme 6: Out in the Garden", config: THEME_6_CONFIG },
    { id: 7, name: "Theme 7: Animals and birds", config: THEME_7_CONFIG },
    { id: 8, name: "Theme 8: Nature", config: THEME_8_CONFIG },
    { id: 9, name: "Theme 9: Ending", config: THEME_9_CONFIG },
];

export default function StudentAssessmentForm({ user, userType, schoolId, onClose, initialThemeId }: Props) {
    const [students, setStudents] = useState<Student[]>([]);
    const [activeGradeTab, setActiveGradeTab] = useState<'H1' | 'H2' | 'H3'>('H1');
    const [selectedThemeId, setSelectedThemeId] = useState<number>(initialThemeId || 1);
    const [allAssessments, setAllAssessments] = useState<Record<string, Record<string, 'can' | 'trying' | 'help'>>>({});
    const [existingAssessmentIds, setExistingAssessmentIds] = useState<Record<string, string>>({});
    const [showAddStudent, setShowAddStudent] = useState(false);
    const [addMode, setAddMode] = useState<'single' | 'bulk'>('single');
    const [showDropped, setShowDropped] = useState(false);
    const [filterSection, setFilterSection] = useState<string>('');
    const [lastSaved, setLastSaved] = useState<string | null>(null);
    const [newStudent, setNewStudent] = useState({ name: '', phone: '', grade: activeGradeTab, section: '' });
    const [schoolName, setSchoolName] = useState<string>('');

    // Bulk add state
    type BulkRow = { name: string; phone: string; section: string; _status?: 'saving' | 'saved' | 'error' | 'dup' };
    const EMPTY_BULK_ROW: BulkRow = { name: '', phone: '', section: '' };
    const [bulkRows, setBulkRows] = useState<BulkRow[]>(
        Array.from({ length: 5 }, () => ({ ...EMPTY_BULK_ROW }))
    );
    const [bulkSaving, setBulkSaving] = useState(false);

    // Synchronize newStudent grade with active tab
    useEffect(() => {
        setNewStudent(prev => ({ ...prev, grade: activeGradeTab }));
    }, [activeGradeTab]);

    const availableSections = Array.from(new Set(students
        .filter(s => s.grade === activeGradeTab)
        .map(s => s.section || '')
        .filter(s => s !== '')
    )).sort();

    const [saving, setSaving] = useState(false);
    const [saveStatus, setSaveStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

    useEffect(() => {
        if (saveStatus) {
            const timer = setTimeout(() => setSaveStatus(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [saveStatus]);

    useEffect(() => {
        loadStudents();
    }, [user.id]);

    useEffect(() => {
        if (activeGradeTab && selectedThemeId) {
            loadAllAssessments();
        }
    }, [activeGradeTab, selectedThemeId, students]);

    const loadStudents = async () => {
        try {
            // Fetch school name first
            const schools = await db.find<any>(Collections.SCHOOLS, { id: schoolId });
            if (schools && schools.length > 0) setSchoolName(schools[0].name);

            // Fetch all students for the school
            const data = await db.find<Student>(Collections.STUDENTS, { school_id: schoolId });

            // If teacher, show only their added students. If mentor, show all in school.
            let filtered = data || [];
            if (userType === 'teacher' && user.id) {
                filtered = filtered.filter(s => s.teacher_id === user.id);
            }

            setStudents(filtered);
        } catch (error) {
            console.error('Error loading students:', error);
        }
    };

    const loadAllAssessments = async () => {
        try {
            const filteredStudentIds = students
                .filter(s => s.grade === activeGradeTab && (showDropped || s.status !== 'dropped'))
                .filter(s => !filterSection || (s.section || '').toUpperCase() === filterSection.toUpperCase())
                .map(s => s.id);
            if (filteredStudentIds.length === 0) {
                setAllAssessments({});
                return;
            }

            const results = await db.find<StudentAssessment>(Collections.STUDENT_ASSESSMENTS, {
                student_id: { $in: filteredStudentIds },
                theme_number: selectedThemeId
            });

            const assessmentsMap: Record<string, Record<string, 'can' | 'trying' | 'help'>> = {};
            const idsMap: Record<string, string> = {};

            results.forEach(record => {
                if (record.student_id) {
                    assessmentsMap[record.student_id] = record.skills || {};
                    idsMap[record.student_id] = record.id!;
                }
            });

            setAllAssessments(assessmentsMap);
            setExistingAssessmentIds(idsMap);
        } catch (error) {
            console.error('Error loading assessments:', error);
        }
    };

    const handleCellToggle = (studentId: string, questionId: string) => {
        setAllAssessments(prev => {
            const studentData = prev[studentId] || {};
            const currentVal = studentData[questionId];

            let newVal: 'can' | 'trying' | 'help' | undefined;
            if (!currentVal) newVal = 'can';
            else if (currentVal === 'can') newVal = 'trying';
            else if (currentVal === 'trying') newVal = 'help';
            else newVal = undefined;

            const updatedStudentData = { ...studentData };
            if (newVal) updatedStudentData[questionId] = newVal;
            else delete updatedStudentData[questionId];

            return {
                ...prev,
                [studentId]: updatedStudentData
            };
        });
    };

    const handleSaveGrid = async () => {
        setSaving(true);
        try {
            const filteredStudents = students.filter(s => 
                s.grade === activeGradeTab && 
                (showDropped || s.status !== 'dropped') &&
                (!filterSection || (s.section || '').toUpperCase() === filterSection.toUpperCase())
            );
            const selectedTheme = THEMES.find(t => t.id === selectedThemeId);

            for (const student of filteredStudents) {
                const skills = allAssessments[student.id!] || {};
                const existingId = existingAssessmentIds[student.id!];

                if (existingId) {
                    await db.updateById(Collections.STUDENT_ASSESSMENTS, existingId, {
                        skills: skills,
                        updated_at: new Date().toISOString()
                    });
                } else if (Object.keys(skills).length > 0) {
                    const assessmentData: Omit<StudentAssessment, 'id'> = {
                        student_id: student.id!,
                        [userType === 'teacher' ? 'teacher_id' : 'mentor_id']: user.id!,
                        school_id: schoolId,
                        theme_number: selectedThemeId,
                        theme_name: selectedTheme?.name.split(': ')[1] || 'Unknown',
                        skills: skills,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    };
                    await db.insertOne<StudentAssessment>(Collections.STUDENT_ASSESSMENTS, assessmentData);
                }
            }

            setSaveStatus({ type: 'success', message: 'Assessments saved successfully!' });
            setLastSaved(new Date().toLocaleTimeString());
            await loadAllAssessments();
        } catch (error) {
            console.error('Error saving assessments:', error);
            setSaveStatus({ type: 'error', message: 'Failed to save assessment' });
        }
        setSaving(false);
    };

    const handleAddStudent = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newStudent.name) return;

        try {
            const studentData: Omit<Student, 'id'> = {
                ...newStudent,
                [userType === 'teacher' ? 'teacher_id' : 'mentor_id']: user.id!,
                school_id: schoolId,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };
            const result = await db.insertOne<Student>(Collections.STUDENTS, studentData);
            if (result && result.id) {
                await loadStudents();
                setActiveGradeTab(newStudent.grade);
                setShowAddStudent(false);
                setNewStudent({ name: '', phone: '', grade: activeGradeTab, section: '' });
            }
        } catch (error) {
            console.error('Error adding student:', error);
        }
    };

    const handleBulkAddStudents = async () => {
        const validRows = bulkRows.filter(r => r.name.trim());
        if (validRows.length === 0) return;
        setBulkSaving(true);

        // Mark existing names (same grade, same school) to warn duplicates
        const existingNames = new Set(
            students
                .filter(s => s.grade === activeGradeTab && s.status !== 'dropped')
                .map(s => s.name.trim().toLowerCase())
        );

        const newStatuses: BulkRow['_status'][] = [];
        for (const row of bulkRows) {
            if (!row.name.trim()) {
                newStatuses.push(undefined);
                continue;
            }
            if (existingNames.has(row.name.trim().toLowerCase())) {
                newStatuses.push('dup');
                continue;
            }
            try {
                const studentData: Omit<Student, 'id'> = {
                    name: row.name.trim(),
                    phone: row.phone.trim(),
                    section: row.section.trim().toUpperCase(),
                    grade: activeGradeTab,
                    [userType === 'teacher' ? 'teacher_id' : 'mentor_id']: user.id!,
                    school_id: schoolId,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                };
                await db.insertOne<Student>(Collections.STUDENTS, studentData);
                existingNames.add(row.name.trim().toLowerCase());
                newStatuses.push('saved');
            } catch {
                newStatuses.push('error');
            }
        }

        setBulkRows(prev =>
            prev.map((row, i) => ({ ...row, _status: newStatuses[i] }))
        );
        setBulkSaving(false);
        await loadStudents();

        const savedCount = newStatuses.filter(s => s === 'saved').length;
        if (savedCount > 0) {
            setSaveStatus({ type: 'success', message: `${savedCount} student${savedCount > 1 ? 's' : ''} added successfully!` });
        }
    };

    const resetBulkRows = () => {
        setBulkRows(Array.from({ length: 5 }, () => ({ ...EMPTY_BULK_ROW })));
    };

    const addBulkRow = () => {
        setBulkRows(prev => [...prev, { ...EMPTY_BULK_ROW }]);
    };

    const removeBulkRow = (idx: number) => {
        setBulkRows(prev => prev.filter((_, i) => i !== idx));
    };

    const updateBulkRow = (idx: number, field: 'name' | 'phone' | 'section', value: string) => {
        setBulkRows(prev => prev.map((r, i) => i === idx ? { ...r, [field]: value, _status: undefined } : r));
    };

    const filteredStudents = students
        .filter(s => s.grade === activeGradeTab && (showDropped || s.status !== 'dropped'))
        .filter(s => !filterSection || (s.section || '').toUpperCase() === filterSection.toUpperCase())
        .sort((a, b) => a.name.localeCompare(b.name));
    const selectedTheme = THEMES.find(t => t.id === selectedThemeId);
    const categories = selectedTheme?.config[activeGradeTab] || [];

    const getCellColor = (val?: string) => {
        if (val === 'can') return 'bg-green-500';
        if (val === 'trying') return 'bg-yellow-400';
        if (val === 'help') return 'bg-red-500';
        return 'bg-white hover:bg-gray-50';
    };

    return (
        <div id="student-assessment-modal" className="fixed inset-0 bg-white z-[60] flex flex-col md:p-4 overflow-hidden print:overflow-visible">
            {/* Control Header - Hidden during print */}
            <div className="flex-none p-4 border-b border-gray-200 bg-white print:hidden flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm z-10">
                <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-600 rounded-lg text-white shadow-lg shadow-blue-200">
                            <ClipboardCheck size={20} />
                        </div>
                        <h3 className="text-lg md:text-xl font-black text-gray-900 tracking-tight">ASSESSMENT GRID</h3>
                    </div>
                    <button onClick={onClose} className="p-2 text-gray-400 hover:text-red-500 transition-colors md:hidden">
                        <X size={24} />
                    </button>
                </div>

                <div className="flex flex-col md:flex-row items-stretch md:items-center gap-4 w-full md:w-auto">
                    <div className="flex gap-2 w-full md:w-auto">
                        <select
                            value={selectedThemeId}
                            onChange={(e) => setSelectedThemeId(Number(e.target.value))}
                            className="bg-gray-50 border border-gray-200 px-3 py-2 rounded-xl text-sm font-bold text-gray-700 outline-none focus:ring-2 focus:ring-blue-500 flex-1 md:flex-none"
                        >
                            {THEMES.map(theme => (
                                <option key={theme.id} value={theme.id}>{theme.name}</option>
                            ))}
                        </select>

                        <div className="flex bg-gray-100 p-1 rounded-xl flex-none">
                            {(['H1', 'H2', 'H3'] as const).map(grade => (
                                <button
                                    key={grade}
                                    onClick={() => setActiveGradeTab(grade)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${activeGradeTab === grade ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                >
                                    {grade}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex items-center gap-2 w-full md:w-auto">
                        <button
                            onClick={() => window.print()}
                            className="hidden md:flex bg-gray-800 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-gray-900 transition-all items-center gap-2"
                        >
                            Print
                        </button>
                        <button
                            onClick={handleSaveGrid}
                            disabled={saving}
                            className="flex-1 md:flex-none bg-blue-600 text-white px-4 md:px-6 py-2 rounded-xl text-xs font-black hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 disabled:opacity-50 text-center"
                        >
                            {saving ? 'Saving...' : 'Save Changes'}
                        </button>
                        {lastSaved && (
                            <div className="hidden md:flex flex-col items-end mr-4">
                                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider leading-none">Last Saved</span>
                                <span className="text-[10px] text-green-600 font-black tracking-widest">{lastSaved}</span>
                            </div>
                        )}
                        <button onClick={onClose} className="hidden md:block p-2 text-gray-400 hover:text-red-500 transition-colors">
                            <X size={24} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Quick Filter Bar - Hidden on Print */}
            <div className="flex-none px-4 py-2 bg-gray-50 border-b border-gray-200 print:hidden flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer group">
                        <div
                            onClick={() => setShowDropped(!showDropped)}
                            className={`w-10 h-5 rounded-full transition-all relative ${showDropped ? 'bg-indigo-600' : 'bg-gray-300'}`}
                        >
                            <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${showDropped ? 'left-5.5' : 'left-0.5'}`} />
                        </div>
                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest group-hover:text-indigo-600 transition-colors">
                            Show Dropped Students
                        </span>
                    </label>

                    <div className="h-4 w-px bg-gray-300 mx-2" />

                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Filter Section:</span>
                        <select
                            value={filterSection}
                            onChange={(e) => setFilterSection(e.target.value)}
                            className="bg-white border border-gray-200 px-3 py-1 rounded-lg text-[10px] font-bold text-gray-700 outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                            <option value="">All Sections</option>
                            {availableSections.map(s => (
                                <option key={s} value={s}>Section {s}</option>
                            ))}
                        </select>
                    </div>
                </div>
                {lastSaved && (
                    <div className="md:hidden flex items-center gap-2">
                        <span className="text-[10px] text-gray-400 font-bold uppercase">Saved: {lastSaved}</span>
                    </div>
                )}
            </div>

            {/* Grid Container */}
            <div className="flex-1 overflow-auto bg-gray-50 p-2 md:p-4 print:p-0 print:bg-white">
                <div className="min-w-max bg-white shadow-2xl rounded-2xl overflow-hidden border border-gray-200 print:shadow-none print:border-none print:m-0">
                    <table className="w-full border-collapse">
                        <thead className="sticky top-0 z-30">
                            {/* Mastery Title Header (Professional Looks) */}
                            <tr className="bg-gray-900 print:bg-gray-100">
                                <th colSpan={filteredStudents.length + 2} className="py-4 md:py-6 px-4 text-center">
                                    <div className="text-white print:text-gray-900">
                                        <h1 className="text-xl md:text-2xl font-black uppercase tracking-[0.2em] mb-1">Assessment Checklist</h1>
                                        <p className="text-blue-400 print:text-gray-600 font-bold tracking-widest text-xs md:text-sm italic">{selectedTheme?.name} - Grade {activeGradeTab}</p>
                                    </div>
                                    {/* Print-only Report Cards for each student */}
                                    <div className="hidden print:block text-left">
                                        {filteredStudents.map(student => (
                                            <div key={`print-rc-${student.id}`} className="break-after-page">
                                                <StudentReportCard
                                                    student={student}
                                                    assessment={{
                                                        theme_number: selectedThemeId,
                                                        grade: activeGradeTab,
                                                        data: allAssessments[student.id!] || {}
                                                    } as any}
                                                    school={{ name: schoolName } as any}
                                                    currentUser={user}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </th>
                            </tr>

                            {/* Student Names Header */}
                            <tr className="bg-white sticky top-[80px] md:top-[108px] z-30 shadow-sm">
                                <th className="sticky left-0 z-40 border-[2px] border-gray-300 p-2 md:p-4 text-left w-[40px] md:w-[60px] align-bottom bg-gray-100 font-black text-[10px] md:text-xs text-center uppercase tracking-tighter">
                                    Sl No
                                </th>
                                <th className="sticky left-[40px] md:left-[60px] z-40 border-[2px] border-gray-300 p-2 md:p-4 text-left w-[140px] md:w-[340px] align-bottom bg-gray-50 shadow-[2px_0_5px_rgba(0,0,0,0.1)]">
                                    <div className="flex flex-col gap-2">
                                        <div className="text-[10px] font-black text-blue-600 uppercase tracking-widest italic">Legend</div>
                                        <div className="flex flex-col md:flex-row gap-1 md:gap-4">
                                            <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-green-500"></div><span className="text-[10px] font-bold text-gray-500">Can</span></div>
                                            <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-yellow-400"></div><span className="text-[10px] font-bold text-gray-500">Trying</span></div>
                                            <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-red-500"></div><span className="text-[10px] font-bold text-gray-500">Help</span></div>
                                        </div>
                                        <div className="mt-1 text-[9px] text-indigo-500 font-medium leading-tight">
                                            * Export Roll Numbers from "My Students" tab in Portal
                                        </div>
                                    </div>
                                </th>
                                {filteredStudents.map(student => (
                                    <th key={student.id} className="border-[2px] border-gray-300 w-10 md:w-12 vertical-header p-0 relative bg-white">
                                        <div className="absolute inset-0 flex items-center justify-center p-1 md:p-2">
                                            <div className="rotate-[-90deg] whitespace-nowrap text-[10px] md:text-xs font-black uppercase tracking-tighter w-[120px] md:w-[150px] text-left flex items-center gap-2">
                                                <span className={student.status === 'dropped' ? 'text-gray-400 italic' : 'text-gray-800'}>
                                                    {student.name} {student.status === 'dropped' ? '(Dropped)' : ''}
                                                </span>
                                                <span className="bg-blue-50 text-blue-600 px-1 py-0.5 rounded text-[8px] border border-blue-100">
                                                    #{student.roll_number || '??'}
                                                </span>
                                            </div>
                                        </div>
                                    </th>
                                ))}
                                {filteredStudents.length === 0 && (
                                    <th className="border-[2px] border-gray-300 p-8 italic text-gray-400 font-medium bg-white">
                                        No students found in this grade. Add some below.
                                    </th>
                                )}
                            </tr>
                        </thead>

                        <tbody className="bg-white">
                            {categories.map((category, catIdx) => (
                                <React.Fragment key={catIdx}>
                                    {/* Category Section Header */}
                                    <tr className="bg-gray-100 print:bg-gray-200 sticky z-20 top-[220px] md:top-[308px]">
                                        <td colSpan={filteredStudents.length + 2} className="py-2 px-4 border-[2px] border-gray-300 text-xs md:text-sm font-black text-gray-900 uppercase tracking-widest text-center shadow-inner">
                                            {category.title}
                                        </td>
                                    </tr>
                                    {category.questions.map((q: any, qIdx: number) => (
                                        <tr key={q.id} className="hover:bg-gray-50 transition-colors group">
                                            <td className="sticky left-0 z-10 border-[2px] border-gray-300 p-2 md:p-3 text-[10px] font-black text-gray-400 bg-gray-50 text-center w-[40px] md:w-[60px]">
                                                {qIdx + 1}
                                            </td>
                                            <td className="sticky left-[40px] md:left-[60px] z-10 border-[2px] border-gray-300 p-2 md:p-3 text-[10px] md:text-[11px] font-bold text-gray-700 leading-tight bg-white group-hover:bg-blue-50 shadow-[2px_0_5px_rgba(0,0,0,0.1)] w-[140px] md:w-[340px]">
                                                {q.text}
                                            </td>
                                            {filteredStudents.map(student => {
                                                const val = allAssessments[student.id!]?.[q.id];
                                                return (
                                                    <td
                                                        key={`${student.id}-${q.id}`}
                                                        onClick={() => handleCellToggle(student.id!, q.id)}
                                                        className={`border-[2px] border-gray-300 cursor-pointer transition-all duration-200 ${getCellColor(val)} ${student.status === 'dropped' ? 'opacity-40 grayscale-[0.5]' : ''}`}
                                                    >
                                                        <div className="w-full h-10 md:h-12 flex items-center justify-center">
                                                            {val && (
                                                                <div className="w-3 h-3 md:w-4 md:h-4 rounded-full bg-white/40 ring-2 md:ring-4 ring-white/30" />
                                                            )}
                                                        </div>
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    ))}
                                </React.Fragment>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Grid Add Student Control - Hidden on Print */}
                <div className="mt-8 mb-16 print:hidden">
                    {!showAddStudent ? (
                        <div className="flex flex-col md:flex-row gap-4">
                            {/* Single Add */}
                            <button
                                onClick={() => {
                                    setNewStudent(prev => ({ ...prev, grade: activeGradeTab }));
                                    setAddMode('single');
                                    setShowAddStudent(true);
                                }}
                                className="flex-1 bg-blue-50 border-2 border-blue-200 p-6 rounded-2xl text-blue-600 font-black flex items-center justify-center gap-3 hover:bg-blue-100 hover:border-blue-300 transition-all group shadow-sm"
                            >
                                <UserPlus size={24} className="group-hover:scale-110 transition-transform" />
                                <div className="text-left">
                                    <div className="text-lg">ADD STUDENT</div>
                                    <div className="text-[10px] font-bold uppercase tracking-widest opacity-60">Single entry for {activeGradeTab}</div>
                                </div>
                            </button>
                            {/* Bulk Add */}
                            <button
                                onClick={() => {
                                    resetBulkRows();
                                    setAddMode('bulk');
                                    setShowAddStudent(true);
                                }}
                                className="flex-1 bg-indigo-50 border-2 border-indigo-200 p-6 rounded-2xl text-indigo-600 font-black flex items-center justify-center gap-3 hover:bg-indigo-100 hover:border-indigo-300 transition-all group shadow-sm"
                            >
                                <Users size={24} className="group-hover:scale-110 transition-transform" />
                                <div className="text-left">
                                    <div className="text-lg">BULK ADD STUDENTS</div>
                                    <div className="text-[10px] font-bold uppercase tracking-widest opacity-60">Multiple entries for {activeGradeTab}</div>
                                </div>
                            </button>
                        </div>
                    ) : addMode === 'single' ? (
                        /* ── Single Add Form ── */
                        <div className="bg-white p-6 rounded-2xl shadow-xl border border-blue-100 animate-in zoom-in-95 duration-200">
                            <h4 className="text-sm font-black text-blue-600 uppercase tracking-widest mb-4">Quick Add Student — {activeGradeTab}</h4>
                            <form onSubmit={handleAddStudent} className="flex flex-col md:flex-row gap-4">
                                <input
                                    type="text"
                                    placeholder="Full Name"
                                    required
                                    value={newStudent.name}
                                    onChange={(e) => setNewStudent({ ...newStudent, name: e.target.value })}
                                    className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl font-bold outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                <input
                                    type="text"
                                    placeholder="Section (e.g. A)"
                                    value={newStudent.section}
                                    onChange={(e) => setNewStudent({ ...newStudent, section: e.target.value.toUpperCase() })}
                                    className="w-full md:w-32 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl font-bold outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                <div className="flex flex-col">
                                    <input
                                        type="tel"
                                        placeholder="Phone"
                                        value={newStudent.phone}
                                        onChange={(e) => setNewStudent({ ...newStudent, phone: e.target.value })}
                                        className="w-full md:w-48 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl font-bold outline-none"
                                    />
                                    <span className="text-[10px] text-green-600 mt-1 font-medium">📱 Updates will be sent by WhatsApp</span>
                                </div>
                                <div className="flex gap-2">
                                    <button type="submit" className="flex-1 bg-green-600 text-white px-8 py-3 rounded-xl font-black shadow-lg shadow-green-100 hover:bg-green-700 transition-all">
                                        ADD
                                    </button>
                                    <button type="button" onClick={() => setShowAddStudent(false)} className="px-8 py-3 text-gray-400 font-bold hover:text-gray-600 transition-all">
                                        CANCEL
                                    </button>
                                </div>
                            </form>
                        </div>
                    ) : (
                        /* ── Bulk Add Form ── */
                        <div className="bg-white rounded-2xl shadow-xl border border-indigo-100 overflow-hidden animate-in zoom-in-95 duration-200">
                            {/* Header */}
                            <div className="flex items-center justify-between px-6 py-4 bg-indigo-600">
                                <div className="flex items-center gap-3">
                                    <Users size={20} className="text-white" />
                                    <div>
                                        <h4 className="text-sm font-black text-white uppercase tracking-widest">Bulk Add Students — {activeGradeTab}</h4>
                                        <p className="text-indigo-200 text-[10px] font-medium mt-0.5">Fill names &amp; phones, then click Save All. Empty rows are skipped.</p>
                                    </div>
                                </div>
                                <button onClick={() => setShowAddStudent(false)} className="p-1.5 text-indigo-200 hover:text-white transition-colors">
                                    <X size={18} />
                                </button>
                            </div>

                            {/* Table */}
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="bg-indigo-50 text-left">
                                            <th className="px-4 py-2 text-[10px] font-black text-indigo-400 uppercase tracking-widest w-10">#</th>
                                            <th className="px-4 py-2 text-[10px] font-black text-indigo-400 uppercase tracking-widest">Student Full Name <span className="text-red-400">*</span></th>
                                            <th className="px-4 py-2 text-[10px] font-black text-indigo-400 uppercase tracking-widest">Parent Phone <span className="text-gray-300">(WhatsApp)</span></th>
                                            <th className="px-4 py-2 text-[10px] font-black text-indigo-400 uppercase tracking-widest w-20">Section</th>
                                            <th className="px-4 py-2 text-[10px] font-black text-indigo-400 uppercase tracking-widest w-10 text-center">Status</th>
                                            <th className="px-3 py-2 w-8"></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {bulkRows.map((row, idx) => {
                                            const statusEl = row._status === 'saved'
                                                ? <span className="text-green-600 text-lg">✓</span>
                                                : row._status === 'dup'
                                                ? <span title="Already exists" className="text-yellow-500 text-lg">⚠</span>
                                                : row._status === 'error'
                                                ? <span title="Save failed" className="text-red-500 text-lg">✗</span>
                                                : null;

                                            const rowBg = row._status === 'saved' ? 'bg-green-50'
                                                : row._status === 'dup' ? 'bg-yellow-50'
                                                : row._status === 'error' ? 'bg-red-50'
                                                : 'bg-white';

                                            return (
                                                <tr key={idx} className={`border-t border-gray-100 ${rowBg} transition-colors`}>
                                                    <td className="px-4 py-2 text-xs font-black text-gray-300 text-center">{idx + 1}</td>
                                                    <td className="px-3 py-1.5">
                                                        <input
                                                            type="text"
                                                            placeholder="e.g. Ayesha Banu"
                                                            value={row.name}
                                                            disabled={row._status === 'saved'}
                                                            onChange={e => updateBulkRow(idx, 'name', e.target.value)}
                                                            className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg font-semibold outline-none focus:ring-2 focus:ring-indigo-400 disabled:opacity-50"
                                                        />
                                                    </td>
                                                    <td className="px-3 py-1.5">
                                                        <input
                                                            type="tel"
                                                            placeholder="e.g. 9876543210"
                                                            value={row.phone}
                                                            disabled={row._status === 'saved'}
                                                            onChange={e => updateBulkRow(idx, 'phone', e.target.value)}
                                                            className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg font-semibold outline-none focus:ring-2 focus:ring-indigo-400 disabled:opacity-50"
                                                        />
                                                    </td>
                                                    <td className="px-3 py-1.5">
                                                        <input
                                                            type="text"
                                                            placeholder="Sec"
                                                            value={row.section}
                                                            disabled={row._status === 'saved'}
                                                            onChange={e => updateBulkRow(idx, 'section', e.target.value.toUpperCase())}
                                                            className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg font-semibold outline-none focus:ring-2 focus:ring-indigo-400 disabled:opacity-50"
                                                        />
                                                    </td>
                                                    <td className="px-2 text-center">{statusEl}</td>
                                                    <td className="px-2">
                                                        {row._status !== 'saved' && (
                                                            <button
                                                                onClick={() => removeBulkRow(idx)}
                                                                className="p-1 text-gray-300 hover:text-red-400 transition-colors"
                                                                title="Remove row"
                                                            >
                                                                <Trash2 size={14} />
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            {/* Legend + Add row */}
                            <div className="px-6 py-3 bg-gray-50 border-t border-gray-100 flex flex-wrap items-center gap-4 text-[10px] font-bold text-gray-400">
                                <button
                                    onClick={addBulkRow}
                                    className="flex items-center gap-1 text-indigo-500 hover:text-indigo-700 font-black transition-colors"
                                >
                                    <Plus size={13} /> Add Row
                                </button>
                                <span className="ml-auto flex items-center gap-3">
                                    <span className="flex items-center gap-1"><span className="text-green-600">✓</span> Saved</span>
                                    <span className="flex items-center gap-1"><span className="text-yellow-500">⚠</span> Already exists</span>
                                    <span className="flex items-center gap-1"><span className="text-red-500">✗</span> Error</span>
                                </span>
                            </div>

                            {/* Action Buttons */}
                            <div className="px-6 py-4 border-t border-gray-100 flex flex-col md:flex-row items-center gap-3">
                                <button
                                    onClick={handleBulkAddStudents}
                                    disabled={bulkSaving || bulkRows.filter(r => r.name.trim()).length === 0}
                                    className="flex-1 bg-indigo-600 text-white py-3 rounded-xl font-black text-sm shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {bulkSaving ? (
                                        <><span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full" /> Saving...</>
                                    ) : (
                                        <><Users size={16} /> Save {bulkRows.filter(r => r.name.trim() && r._status !== 'saved').length > 0 ? bulkRows.filter(r => r.name.trim() && r._status !== 'saved').length : ''} Students</>
                                    )}
                                </button>
                                <button
                                    onClick={() => { resetBulkRows(); }}
                                    disabled={bulkSaving}
                                    className="px-6 py-3 bg-gray-100 text-gray-500 rounded-xl font-black text-sm hover:bg-gray-200 transition-all disabled:opacity-50"
                                >
                                    Reset
                                </button>
                                <button
                                    onClick={() => setShowAddStudent(false)}
                                    disabled={bulkSaving}
                                    className="px-6 py-3 text-gray-400 font-bold text-sm hover:text-gray-600 transition-all disabled:opacity-50"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <style>{`
                .vertical-header {
                    height: 140px;
                    min-width: 40px;
                }
                @media (min-width: 768px) {
                    .vertical-header {
                        height: 200px;
                        min-width: 48px;
                    }
                }
                
                @media print {
                    @page {
                        size: A4 landscape;
                        margin: 0.5cm;
                    }
                    
                    /* Hide everything in the body */
                    body * {
                        visibility: hidden;
                    }
                    
                    /* Show only the modal and its content */
                    #student-assessment-modal, #student-assessment-modal * {
                        visibility: visible;
                    }
                    
                    #student-assessment-modal {
                        position: absolute !important;
                        left: 0 !important;
                        top: 0 !important;
                        width: 100% !important;
                        height: auto !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        background: white !important;
                        display: block !important;
                    }

                    .print\\:hidden {
                        display: none !important;
                    }

                    .shadow-sm, .shadow-md, .shadow-lg, .shadow-xl, .shadow-2xl {
                        box-shadow: none !important;
                    }
                    
                    .bg-gray-900 {
                        background-color: #f3f4f6 !important;
                        color: black !important;
                    }
                    
                    .text-white {
                        color: black !important;
                    }
                    
                    .border-[2px] {
                        border-width: 1px !important;
                        border-color: #000 !important;
                    }
                    
                    .bg-green-500 { background-color: #d1fae5 !important; -webkit-print-color-adjust: exact; }
                    .bg-yellow-400 { background-color: #fef3c7 !important; -webkit-print-color-adjust: exact; }
                    .bg-red-500 { background-color: #fee2e2 !important; -webkit-print-color-adjust: exact; }

                    /* Ensure headers are not sticky during print and don't overlap */
                    .sticky {
                        position: static !important;
                    }
                }
            `}</style>

            {/* Toast Notification */}
            {saveStatus && (
                <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 rounded-xl shadow-2xl text-white font-bold text-sm transition-all animate-in slide-in-from-bottom-4 duration-300 print:hidden ${saveStatus.type === 'success' ? 'bg-green-600' : 'bg-red-600'
                    }`}>
                    {saveStatus.message}
                </div>
            )}
        </div>
    );
}

