import json
import glob
import pandas as pd
import datetime
result = []
for f in glob.glob("./apify_storage/datasets/default/*.json"):
    print('parsing...... ',f)
    with open(f, "rb") as infile:
        result.append(json.load(infile))
df = pd.DataFrame(result)
name = datetime.datetime.now().strftime('%Y_%m_%d_%H:%M')+'_dataset_google'
df.to_excel('./data_delivery/'+name+'.xlsx',index=False)
print('data_delivery'+name+'.xlsx'+ ' Exported succesfully')

