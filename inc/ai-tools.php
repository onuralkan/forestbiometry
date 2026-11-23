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
];
