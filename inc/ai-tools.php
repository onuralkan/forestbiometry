<?php
// The tools that offer the AI interpretation (api/interpret.php) and what the model has to know about each one's result
// object. The administration panel (administration.php → Settings) lists them with an on/off switch each (22 Nov 2026).
// A tool joins by adding its id here and calling mountInterpret() on its result view (PROJECT.md §3).
declare(strict_types=1);

/** Tools that may ask for an interpretation, with what the model has to know about each one's result object. */
const FB_TOOLS = [
    'model-degerlendirme' => [
        'name' => 'Model Evaluation (Forest Biometry)',
        'guide' => "The object compares the predictions of one or more models (or columns of predicted values) with observed values. "
            . "Errors are e = y − ŷ (observed − predicted): positive bias means the model under-predicts on average. "
            . "Measures per model: bias (mean error), MAE, RMSE, relative versions, prediction R² (1 − SSE/SST, can be negative), "
            . "optional groups (plot, species, fold, diameter class), optional inference (t interval for the bias, equivalence tests "
            . "against a margin, bootstrap percentile/BCa intervals), and optionally a bootstrap of the overall rank (Poudel and Cao 2013, Eq. 10). "
            . "rows.sameSample tells whether all models were evaluated on the same rows; settings.models[].role says whether a column comes "
            . "from training data, test data or cross-validation (a training-data evaluation is optimistic).",
    ],
    'cap-dagilimi' => [
        'name' => 'Diameter Distribution (Forest Biometry)',
        'guide' => "The object holds the distributions fitted to the tree diameters (cm) of ONE analysis unit (unit.plot / unit.period; unit.of = number of units in the data set) "
            . "and its descriptive statistics (n, mean, quadratic mean diameter dq, min, max, variance with divisor n (varN) and n − 1 (varN1); for class data counts per class). "
            . "settings: data type (raw diameters or classes, per-hectare or counted frequencies), measurement threshold or truncation, fixed location a or fixed bounds (values the user set, not estimated). "
            . "comparison: groups of fits with the same observation process; inside a group, likelihoodFits are maximum-likelihood fits on the same n and may be compared by AIC, BIC, AICc and ln L "
            . "(dAIC/dBIC = difference from the smallest; k = free parameters), descriptiveFits (moments, percentiles, parameter recovery, L-moments, minimum-distance) are compared only by KS D, Anderson–Darling A², Cramér–von Mises W², "
            . "the class error l1 and the error index ei; for descriptive fits ln L is only a log-score, never an AIC. Fits of different groups are never ranked together. Smaller AIC, BIC, KS, AD, CvM, l1, ei are better. "
            . "There are no p-values: with parameters estimated from the same data the standard tables of KS/AD do not apply. failed lists fits without a solution and the reason codes. "
            . "Weibull parameters: a location, b scale, c shape; other families as named. sources: the methods' references. "
            . "Point out when a parameter sits at a boundary or a warning code is present, and that one unit of n trees supports limited conclusions.",
    ],
];
