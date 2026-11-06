# [AUNEA-BE-PG11-GLOBAL-ALTERNATIVE-294] START
# SOURCE: Simulator CANONICAL PG11; DEC-034/050/052/055.
# INPUT: confirmed scoped context, rejected action, stated constraints.
# OUTPUT: review evidence. No business writes or approvals.
from .internal_ai_global_review import assess_recommendation

def confirmed_conflict(action, constraints, context):
    review = assess_recommendation(action, context, constraints)
    if review["status"] != "INCOMPATIBLE" or not review["conflicts"]:
        raise ValueError("La propuesta no contradice ninguna restricción confirmada.")
    return review
# [AUNEA-BE-PG11-GLOBAL-ALTERNATIVE-294] END
